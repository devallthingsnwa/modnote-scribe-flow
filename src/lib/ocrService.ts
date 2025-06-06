
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
      console.log('Starting OCR extraction for:', file.name, 'Type:', file.type, 'Size:', file.size);

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

      // Check file size (5MB limit for OCR.space)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is 5MB, your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      if (file.size === 0) {
        throw new Error('File appears to be empty');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      console.log('Calling OCR edge function with language:', language);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
        body: formData,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`OCR service error: ${error.message || 'Unknown error'}`);
      }

      console.log('OCR edge function response:', data);

      if (!data) {
        throw new Error('No response from OCR service');
      }

      if (!data.success) {
        throw new Error(data.error || 'OCR extraction failed');
      }

      return {
        success: true,
        text: data.text,
        confidence: data.confidence,
        fileInfo: data.fileInfo
      };

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

  static getSupportedFileTypes() {
    return [
      { extension: 'jpg', type: 'image/jpeg', description: 'JPEG Image' },
      { extension: 'jpeg', type: 'image/jpeg', description: 'JPEG Image' },
      { extension: 'png', type: 'image/png', description: 'PNG Image' },
      { extension: 'gif', type: 'image/gif', description: 'GIF Image' },
      { extension: 'bmp', type: 'image/bmp', description: 'BMP Image' },
      { extension: 'tiff', type: 'image/tiff', description: 'TIFF Image' },
      { extension: 'pdf', type: 'application/pdf', description: 'PDF Document' }
    ];
  }
}
