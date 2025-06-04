
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
        
        // If the API key is invalid, let's try a fallback approach
        if (response.status === 403) {
          console.log('🔄 API key invalid, attempting fallback extraction...');
          return await this.fallbackTextExtraction(file);
        }
        
        throw new Error(`OCR API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📄 OCR API response:', result);

      if (result.IsErroredOnProcessing) {
        console.error('❌ OCR processing error:', result.ErrorMessage);
        
        // Try fallback if OCR processing failed
        if (result.ErrorMessage?.includes('invalid') || result.ErrorMessage?.includes('key')) {
          console.log('🔄 OCR processing failed, attempting fallback extraction...');
          return await this.fallbackTextExtraction(file);
        }
        
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      if (!result.ParsedResults || result.ParsedResults.length === 0) {
        console.warn('⚠️ No text found in document');
        return await this.fallbackTextExtraction(file);
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
      
      // Try fallback extraction as last resort
      console.log('🔄 Primary OCR failed, attempting fallback extraction...');
      return await this.fallbackTextExtraction(file);
    }
  }

  /**
   * Fallback text extraction method when primary OCR fails
   */
  private static async fallbackTextExtraction(file: File): Promise<OCRResponse> {
    try {
      // For text files, read directly
      if (file.type === 'text/plain') {
        const text = await file.text();
        return {
          success: true,
          extractedText: this.cleanExtractedText(text)
        };
      }

      // For PDFs and images, provide a helpful message
      if (file.type === 'application/pdf') {
        return {
          success: false,
          extractedText: '',
          error: 'PDF text extraction is temporarily unavailable. Please try converting the PDF to images or use a different OCR service.'
        };
      }

      if (file.type.startsWith('image/')) {
        return {
          success: false,
          extractedText: '',
          error: 'Image text extraction is temporarily unavailable. The OCR service may be experiencing issues. Please try again later or use a different image.'
        };
      }

      return {
        success: false,
        extractedText: '',
        error: 'Unsupported file type for text extraction.'
      };

    } catch (error) {
      console.error('❌ Fallback extraction failed:', error);
      return {
        success: false,
        extractedText: '',
        error: 'Text extraction failed. Please try a different file or check your internet connection.'
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
      'application/pdf',
      'text/plain'
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
        error: 'Unsupported file type. Please upload PDF, JPG, PNG, GIF, WebP, BMP, TIFF, or text files.'
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
