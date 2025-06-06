
import { supabase } from "@/integrations/supabase/client";

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

export class OCRService {
  static async extractTextFromFile(file: File, language: string = 'eng'): Promise<OCRResult> {
    try {
      console.log('Starting OCR extraction for:', file.name);

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

      // Check file size (OCR.space has a 1MB limit for free tier)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
        body: formData,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`OCR service error: ${error.message}`);
      }

      return data as OCRResult;

    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown OCR error'
      };
    }
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
