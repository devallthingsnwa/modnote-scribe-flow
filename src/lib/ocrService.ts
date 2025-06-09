
import { supabase } from "@/integrations/supabase/client";
import { ImagePreprocessor, PreprocessingOptions } from "./ocr/imagePreprocessor";
import { TextPostProcessor, PostProcessingOptions } from "./ocr/textPostProcessor";
import { MultiEngineOCR } from "./ocr/multiEngineOCR";

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
      // Only handle image files - PDFs are handled separately in FileTab
      const supportedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/webp'
      ];

      if (!supportedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. This OCR service only handles images. Use the Documents section for PDFs.`);
      }

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

    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    const startTime = Date.now();

    try {
      // Handle image files with OCR service
      console.log('Image file detected - using OCR service');
      
      // For now, return a message that OCR requires configuration
      // This can be updated when OCR API is properly configured
      return {
        success: false,
        error: 'OCR service for images requires API configuration. Please contact administrator to enable OCR functionality for image files.'
      };

    } catch (error) {
      console.error('Enhanced OCR extraction failed:', error);
      throw error;
    }
  }

  private static async extractTextBasic(file: File, language: string): Promise<OCRResult> {
    console.log('Using basic OCR extraction for:', file.name);

    // For images, return appropriate message
    return {
      success: false,
      error: 'Image OCR requires API configuration. Currently only direct document text extraction is supported.'
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
