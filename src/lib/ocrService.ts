
import { supabase } from "@/integrations/supabase/client";
import { ImagePreprocessor, PreprocessingOptions } from "./ocr/imagePreprocessor";
import { TextPostProcessor, PostProcessingOptions } from "./ocr/textPostProcessor";
import { MultiEngineOCR } from "./ocr/multiEngineOCR";
import { PDFTextExtractor } from "./ocr/pdfTextExtractor";

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  engine?: string;
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  error?: string;
  processingTime?: number;
  structure?: {
    paragraphs: string[];
    sentences: string[];
    wordCount: number;
    confidence: number;
  };
}

export interface EnhancedOCROptions {
  language?: string;
  preprocessing?: PreprocessingOptions;
  postprocessing?: PostProcessingOptions;
  useMultipleEngines?: boolean;
  maxAttempts?: number;
}

export class OCRService {
  static async extractTextFromFile(
    file: File, 
    options: EnhancedOCROptions = {}
  ): Promise<OCRResult> {
    const startTime = performance.now();
    
    try {
      console.log('Starting enhanced OCR extraction for:', file.name);
      console.log('Options:', options);

      // Validate file type
      const supportedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/bmp', 'image/tiff', 'application/pdf'
      ];

      if (!supportedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, PDF`);
      }

      // Check file size (increased limit for better processing)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      }

      let processedFile = file;

      // Handle PDF files separately
      if (file.type === 'application/pdf') {
        console.log('Processing PDF file with specialized extractor');
        const pdfResult = await PDFTextExtractor.extractTextFromPDF(file);
        
        if (pdfResult.success && pdfResult.text) {
          const postProcessed = TextPostProcessor.cleanText(
            pdfResult.text, 
            options.postprocessing
          );
          
          const structure = TextPostProcessor.extractTextStructure(postProcessed);
          
          return {
            success: true,
            text: postProcessed,
            confidence: structure.confidence,
            engine: 'PDF Extractor',
            fileInfo: {
              name: file.name,
              type: file.type,
              size: file.size
            },
            processingTime: performance.now() - startTime,
            structure
          };
        } else {
          // Fall back to OCR for image-based PDFs
          console.log('PDF text extraction failed, falling back to OCR');
        }
      }

      // Preprocess images for better OCR accuracy
      if (file.type.startsWith('image/') && options.preprocessing) {
        console.log('Applying image preprocessing');
        const preprocessingOptions = {
          denoise: true,
          binarize: true,
          deskew: true,
          enhance: true,
          ...options.preprocessing
        };
        
        try {
          processedFile = await ImagePreprocessor.preprocessImage(file, preprocessingOptions);
          console.log('Image preprocessing completed');
        } catch (preprocessError) {
          console.warn('Image preprocessing failed, using original file:', preprocessError);
          processedFile = file;
        }
      }

      // Use multiple OCR engines for better accuracy
      let result: OCRResult;
      
      if (options.useMultipleEngines !== false) {
        console.log('Using multi-engine OCR approach');
        result = await MultiEngineOCR.processWithMultipleEngines(
          processedFile,
          options.language || 'eng',
          options.maxAttempts || 2
        );
      } else {
        console.log('Using single OCR engine');
        result = await this.extractWithSingleEngine(processedFile, options.language || 'eng');
      }

      if (!result.success || !result.text) {
        throw new Error(result.error || 'OCR extraction failed');
      }

      // Post-process the extracted text
      console.log('Applying text post-processing');
      const postProcessingOptions = {
        removeExtraSpaces: true,
        fixLineBreaks: true,
        preserveStructure: true,
        ...options.postprocessing
      };

      const cleanedText = TextPostProcessor.cleanText(result.text, postProcessingOptions);
      const textStructure = TextPostProcessor.extractTextStructure(cleanedText);

      const finalResult: OCRResult = {
        ...result,
        text: cleanedText,
        confidence: Math.max(result.confidence || 0, textStructure.confidence),
        processingTime: performance.now() - startTime,
        structure: textStructure
      };

      console.log(`OCR completed successfully in ${finalResult.processingTime?.toFixed(0)}ms`);
      console.log(`Extracted ${finalResult.text.length} characters with ${(finalResult.confidence || 0 * 100).toFixed(1)}% confidence`);

      return finalResult;

    } catch (error) {
      console.error('Enhanced OCR extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OCR error',
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        processingTime: performance.now() - startTime
      };
    }
  }

  private static async extractWithSingleEngine(file: File, language: string): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
      body: formData,
    });

    if (error) {
      throw new Error(`OCR service error: ${error.message}`);
    }

    return data as OCRResult;
  }

  static getSupportedLanguages() {
    return MultiEngineOCR.getSupportedLanguages();
  }

  static async validateFile(file: File): Promise<{
    valid: boolean;
    error?: string;
    suggestions?: string[];
  }> {
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/bmp', 'image/tiff', 'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}`,
        suggestions: [
          'Try converting to JPG, PNG, or PDF format',
          'Ensure the file is a valid image or PDF document'
        ]
      };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
        suggestions: [
          'Compress the image to reduce file size',
          'Use a smaller resolution image',
          'Split large PDFs into smaller sections'
        ]
      };
    }

    if (file.size < 1024) { // Less than 1KB
      return {
        valid: false,
        error: 'File appears to be too small or corrupted',
        suggestions: [
          'Ensure the file is a valid document',
          'Try uploading a different file'
        ]
      };
    }

    return { valid: true };
  }
}
