import { supabase } from "@/integrations/supabase/client";
import { ImagePreprocessor, PreprocessingOptions } from "./ocr/imagePreprocessor";
import { TextPostProcessor, PostProcessingOptions } from "./ocr/textPostProcessor";
import { MultiEngineOCR } from "./ocr/multiEngineOCR";
import { PDFTextExtractor } from "./ocr/pdfTextExtractor";

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: string;
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  error?: string;
}

export interface EnhancedOCROptions {
  language: string;
  useMultipleEngines: boolean;
  preprocessing: PreprocessingOptions;
  postprocessing: PostProcessingOptions;
}

export class OCRService {
  static async extractTextFromFile(
    file: File, 
    language: string = 'eng',
    useEnhanced: boolean = true
  ): Promise<OCRResult> {
    try {
      if (useEnhanced) {
        return await this.extractTextWithEnhancedOCR(file, {
          language,
          useMultipleEngines: true,
          preprocessing: {
            denoise: true,
            binarize: true,
            deskew: true,
            enhance: true
          },
          postprocessing: {
            removeExtraSpaces: true,
            fixLineBreaks: true,
            preserveStructure: true
          }
        });
      } else {
        return await this.extractTextBasic(file, language);
      }
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OCR error'
      };
    }
  }

  static async extractTextWithEnhancedOCR(file: File, options: EnhancedOCROptions): Promise<OCRResult> {
    console.log('Starting enhanced OCR extraction for:', file.name);
    console.log('Options:', options);

    // Validate file type
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, PDF`);
    }

    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    let extractedText = '';
    const startTime = Date.now();

    try {
      if (PDFTextExtractor.isPDFFile(file)) {
        // Handle PDF files with direct text extraction
        console.log('Processing PDF file with text extraction');
        extractedText = await PDFTextExtractor.extractTextFromPDF(file);
        
        if (!extractedText.trim()) {
          console.log('PDF text extraction returned empty - this might be a scanned PDF or image-based PDF');
          return {
            success: false,
            error: 'This PDF appears to contain scanned images or no extractable text. The document may be image-based. Please try a PDF with selectable text, or use an OCR service to convert scanned documents.'
          };
        }
      } else {
        // Handle image files - OCR service requires configuration
        console.log('Image file detected - OCR service requires API configuration');
        return {
          success: false,
          error: 'OCR service for images requires API configuration. Please contact administrator to enable OCR functionality for image files.'
        };
      }

      // Apply text post-processing
      extractedText = TextPostProcessor.processText(extractedText, options.postprocessing);

      const duration = Date.now() - startTime;
      const confidence = this.calculateConfidence(extractedText);
      
      console.log(`Text extraction completed successfully in ${duration}ms`);
      console.log(`Extracted ${extractedText.length} characters with ${confidence}% confidence`);

      return {
        success: true,
        text: extractedText,
        confidence: `${confidence}%`,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      };

    } catch (error) {
      console.error('Enhanced text extraction failed:', error);
      throw error;
    }
  }

  private static async extractTextBasic(file: File, language: string): Promise<OCRResult> {
    console.log('Using basic OCR extraction for:', file.name);

    // Check if it's a PDF first
    if (PDFTextExtractor.isPDFFile(file)) {
      try {
        const text = await PDFTextExtractor.extractTextFromPDF(file);
        if (text.trim()) {
          return {
            success: true,
            text,
            confidence: '85%',
            fileInfo: {
              name: file.name,
              type: file.type,
              size: file.size
            }
          };
        } else {
          return {
            success: false,
            error: 'This PDF contains no extractable text. It may be a scanned document or image-based PDF.'
          };
        }
      } catch (error) {
        console.error('PDF extraction failed in basic mode:', error);
        return {
          success: false,
          error: 'PDF processing failed. The file may be corrupted or in an unsupported format.'
        };
      }
    }

    // For images, return appropriate message
    return {
      success: false,
      error: 'Image OCR requires API configuration. Currently only PDFs with selectable text are supported.'
    };
  }

  private static calculateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    let score = 50; // Base score
    
    if (text.length > 100) score += 20;
    else if (text.length > 50) score += 10;
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    if (words.length > 20) score += 15;
    else if (words.length > 10) score += 10;
    
    const uniqueChars = new Set(text.toLowerCase()).size;
    if (uniqueChars > 20) score += 10;
    
    const specialChars = text.match(/[^a-zA-Z0-9\s.,!?;:()\-'"]/g);
    if (specialChars && specialChars.length > text.length * 0.1) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  static getSupportedLanguages() {
    return [
      { code: 'eng', name: 'English' },
      { code: 'ara', name: 'Arabic' },
      { code: 'bul', name: 'Bulgarian' },
      { code: 'chs', name: 'Chinese (Simplified)' },
      { code: 'cht', name: 'Chinese (Traditional)' },
      { code: 'hrv', name: 'Croatian' },
      { code: 'cze', name: 'Czech' },
      { code: 'dan', name: 'Danish' },
      { code: 'dut', name: 'Dutch' },
      { code: 'fin', name: 'Finnish' },
      { code: 'fre', name: 'French' },
      { code: 'ger', name: 'German' },
      { code: 'gre', name: 'Greek' },
      { code: 'hun', name: 'Hungarian' },
      { code: 'kor', name: 'Korean' },
      { code: 'ita', name: 'Italian' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'pol', name: 'Polish' },
      { code: 'por', name: 'Portuguese' },
      { code: 'rus', name: 'Russian' },
      { code: 'slv', name: 'Slovenian' },
      { code: 'spa', name: 'Spanish' },
      { code: 'swe', name: 'Swedish' },
      { code: 'tur', name: 'Turkish' }
    ];
  }
}
