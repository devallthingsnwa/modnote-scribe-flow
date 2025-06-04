
interface OCRResponse {
  success: boolean;
  extractedText: string;
  error?: string;
}

export class OCRService {
  private static readonly API_KEY = "F0PkbAV0rzojU3RxAkXXWBZzgQJdgpvL";
  private static readonly OCR_API_URL = "https://api.ocr.space/parse/image";

  /**
   * Extract text from image or PDF file using OCR.space API
   */
  static async extractTextFromFile(file: File): Promise<OCRResponse> {
    try {
      console.log('🔍 Starting OCR extraction for:', file.name);
      console.log('📁 File type:', file.type);
      console.log('📏 File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('apikey', this.API_KEY);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('isTable', 'true'); // Better handling of tabular data

      console.log('🚀 Making OCR API request to:', this.OCR_API_URL);
      console.log('🔑 Using API key:', this.API_KEY.substring(0, 10) + '...');

      const response = await fetch(this.OCR_API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header when using FormData - let browser set it
        }
      });

      console.log('📡 OCR API response status:', response.status);
      console.log('📡 OCR API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OCR API error response:', errorText);
        throw new Error(`OCR API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📄 OCR API response:', result);

      if (result.IsErroredOnProcessing) {
        console.error('❌ OCR processing error:', result.ErrorMessage);
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      if (!result.ParsedResults || result.ParsedResults.length === 0) {
        console.warn('⚠️ No text found in document');
        return {
          success: false,
          extractedText: '',
          error: 'No text found in the document'
        };
      }

      // Extract text from all pages
      let extractedText = '';
      for (const page of result.ParsedResults) {
        if (page.ParsedText) {
          extractedText += page.ParsedText + '\n\n';
        }
      }

      // Clean up the extracted text
      extractedText = this.cleanExtractedText(extractedText.trim());

      console.log('✅ Text extraction completed. Length:', extractedText.length);
      console.log('📝 Extracted text preview:', extractedText.substring(0, 200) + '...');

      return {
        success: true,
        extractedText
      };

    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      
      // Provide more specific error messages
      let errorMessage = 'OCR extraction failed';
      if (error.message.includes('403')) {
        errorMessage = 'OCR API authentication failed. Please check the API key.';
      } else if (error.message.includes('429')) {
        errorMessage = 'OCR API rate limit exceeded. Please try again later.';
      } else if (error.message.includes('413')) {
        errorMessage = 'File too large for OCR processing. Please try a smaller file.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        extractedText: '',
        error: errorMessage
      };
    }
  }

  /**
   * Clean and format extracted text
   */
  private static cleanExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR issues
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
  }

  /**
   * Check if file type is supported for OCR
   */
  static isSupportedFileType(file: File): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'application/pdf'
    ];
    return supportedTypes.includes(file.type);
  }

  /**
   * Validate file for OCR processing
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.isSupportedFileType(file)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please upload PDF, JPG, PNG, GIF, WebP, BMP, or TIFF files.'
      };
    }

    // Check file size (OCR.space free tier has 1MB limit, paid has 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`
      };
    }

    return { valid: true };
  }
}
