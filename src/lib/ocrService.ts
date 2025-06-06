
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
  retryAttempt?: number;
}

export interface OCRRetryOptions {
  maxRetries: number;
  retryDelay: number;
  onRetry?: (attempt: number, error: string) => void;
}

export class OCRService {
  private static readonly DEFAULT_RETRY_OPTIONS: OCRRetryOptions = {
    maxRetries: 3,
    retryDelay: 2000,
  };

  static async extractTextFromFile(
    file: File, 
    language: string = 'eng',
    retryOptions: Partial<OCRRetryOptions> = {}
  ): Promise<OCRResult> {
    const options = { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions };
    
    // Validate file before attempting OCR
    const validationResult = this.validateFile(file);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error
      };
    }

    let lastError = '';
    
    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      console.log(`OCR attempt ${attempt}/${options.maxRetries} for file: ${file.name}`);
      
      try {
        const result = await this.performOCRExtraction(file, language, attempt);
        
        if (result.success) {
          console.log(`OCR successful on attempt ${attempt}`);
          return { ...result, retryAttempt: attempt };
        }
        
        lastError = result.error || 'Unknown error';
        console.warn(`OCR attempt ${attempt} failed:`, lastError);
        
        // Notify retry callback if provided
        if (options.onRetry && attempt < options.maxRetries) {
          options.onRetry(attempt, lastError);
        }
        
        // Wait before retrying (except on last attempt)
        if (attempt < options.maxRetries) {
          await this.delay(options.retryDelay * attempt); // Exponential backoff
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network or service error';
        console.error(`OCR attempt ${attempt} threw error:`, error);
        
        if (options.onRetry && attempt < options.maxRetries) {
          options.onRetry(attempt, lastError);
        }
        
        if (attempt < options.maxRetries) {
          await this.delay(options.retryDelay * attempt);
        }
      }
    }

    return {
      success: false,
      error: `OCR failed after ${options.maxRetries} attempts. Last error: ${lastError}`,
      retryAttempt: options.maxRetries
    };
  }

  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file existence
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Check file size (empty files)
    if (file.size === 0) {
      return { valid: false, error: 'File appears to be empty (0 bytes)' };
    }

    // Check file type
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, WEBP, PDF` 
      };
    }

    // Check file size (5MB limit for OCR.space)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File too large. Maximum size is 5MB, your file is ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      };
    }

    // Check minimum file size (avoid tiny files that might be corrupted)
    const minSize = 100; // 100 bytes
    if (file.size < minSize) {
      return { 
        valid: false, 
        error: 'File too small. Please ensure the file is not corrupted.' 
      };
    }

    return { valid: true };
  }

  private static async performOCRExtraction(file: File, language: string, attempt: number): Promise<OCRResult> {
    console.log(`Starting OCR extraction for: ${file.name}, Type: ${file.type}, Size: ${file.size}, Attempt: ${attempt}`);

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('attempt', attempt.toString());

    console.log('Calling OCR edge function with language:', language);

    // Call the edge function with timeout
    const response = await Promise.race([
      supabase.functions.invoke('ocr-text-extraction', {
        body: formData,
      }),
      this.timeoutPromise<any>(30000) // 30 second timeout
    ]);

    const { data, error } = response;

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
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static timeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR request timed out')), ms)
    );
  }

  static async testOCRService(): Promise<{ available: boolean; error?: string }> {
    try {
      // Create a minimal test request to check service availability
      const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
        body: new FormData(), // Empty form data for health check
      });

      if (error && error.message.includes('No file provided')) {
        // This specific error means the service is responding correctly
        return { available: true };
      }

      return { available: false, error: error?.message || 'Service unavailable' };
    } catch (error) {
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown service error' 
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
      { extension: 'webp', type: 'image/webp', description: 'WebP Image' },
      { extension: 'pdf', type: 'application/pdf', description: 'PDF Document' }
    ];
  }

  static getImageQualityTips() {
    return [
      'Use high-resolution images (at least 300 DPI)',
      'Ensure good contrast between text and background',
      'Avoid blurry or out-of-focus images',
      'Make sure text is horizontal and not rotated',
      'Remove shadows and reflections from the image',
      'Use well-lit images without glare',
      'Crop the image to focus on the text area',
      'For PDFs, ensure they are not password-protected'
    ];
  }
}
