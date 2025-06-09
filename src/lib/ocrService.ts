
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
  method?: string;
  processingTime?: number;
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
    console.log('🔍 Starting enhanced OCR extraction for:', file.name);

    // Validate file type
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/bmp', 'image/tiff', 'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, PDF`);
    }

    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    const startTime = Date.now();

    try {
      // Try the enhanced Edge Function first
      console.log('🚀 Using enhanced OCR Edge Function');
      const result = await this.callEnhancedOCRFunction(file, options.language);
      
      if (result.success && result.text) {
        // Apply text post-processing
        const processedText = TextPostProcessor.processText(result.text, options.postprocessing);
        
        console.log('✅ OCR Edge Function successful');
        return {
          ...result,
          text: processedText,
          confidence: result.confidence ? `${Math.round(parseFloat(result.confidence) * 100)}%` : '85%'
        };
      }
      
      throw new Error(result.error || 'Enhanced OCR function failed');

    } catch (edgeError) {
      console.warn('Enhanced OCR Edge Function failed:', edgeError);
      
      // Fallback to client-side processing
      console.log('🔄 Falling back to client-side OCR');
      
      if (PDFTextExtractor.isPDFFile(file)) {
        // Try PDF text extraction
        try {
          const extractedText = await PDFTextExtractor.extractTextFromPDF(file);
          
          if (extractedText && extractedText.length > 50) {
            const processedText = TextPostProcessor.processText(extractedText, options.postprocessing);
            
            console.log('✅ Client-side PDF extraction successful');
            return {
              success: true,
              text: processedText,
              confidence: '90%',
              fileInfo: {
                name: file.name,
                type: file.type,
                size: file.size
              },
              method: 'client-pdf-extraction'
            };
          }
        } catch (pdfError) {
          console.warn('PDF text extraction failed:', pdfError);
        }
      }
      
      // Try client-side Tesseract
      try {
        console.log('🔄 Trying client-side Tesseract OCR');
        const tesseractResult = await this.extractWithClientSideTesseract(file, options.language);
        if (tesseractResult.success && tesseractResult.text) {
          const processedText = TextPostProcessor.processText(tesseractResult.text, options.postprocessing);
          console.log('✅ Client-side Tesseract successful');
          return {
            ...tesseractResult,
            text: processedText
          };
        }
      } catch (tesseractError) {
        console.error('Client-side Tesseract failed:', tesseractError);
      }
      
      throw new Error(`All OCR methods failed. Edge Function: ${edgeError.message}`);
    }
  }

  private static async callEnhancedOCRFunction(file: File, language: string): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      console.log(`📤 Calling OCR Edge Function for ${file.name}`);

      const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
        body: formData,
      });

      if (error) {
        console.error('OCR Edge Function error:', error);
        throw new Error(`OCR Edge Function error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from OCR Edge Function');
      }

      console.log('✅ OCR Edge Function completed successfully');
      return data as OCRResult;

    } catch (error) {
      console.error('Failed to call OCR Edge Function:', error);
      throw error;
    }
  }

  private static async extractWithClientSideTesseract(file: File, language: string): Promise<OCRResult> {
    try {
      console.log('🔍 Starting client-side Tesseract OCR');
      
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(file, language, {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            console.log(`Tesseract progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      });

      const extractedText = result.data.text.trim();
      
      if (!extractedText) {
        throw new Error('No text could be extracted from the file');
      }

      console.log(`✅ Client-side Tesseract completed. Extracted ${extractedText.length} characters`);

      return {
        success: true,
        text: extractedText,
        confidence: `${Math.round(result.data.confidence)}%`,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        method: 'client-tesseract'
      };

    } catch (error) {
      console.error('Client-side Tesseract failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Client-side OCR failed'
      };
    }
  }

  private static async extractTextBasic(file: File, language: string): Promise<OCRResult> {
    console.log('🔍 Using basic OCR extraction for:', file.name);

    try {
      return await this.callEnhancedOCRFunction(file, language);
    } catch (edgeError) {
      console.warn('Edge function failed, trying client-side:', edgeError);
      return await this.extractWithClientSideTesseract(file, language);
    }
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
