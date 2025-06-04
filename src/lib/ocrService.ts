
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

      const formData = new FormData();
      formData.append('file', file);
      formData.append('apikey', this.API_KEY);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('isTable', 'true'); // Better handling of tabular data

      const response = await fetch(this.OCR_API_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OCR API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('📄 OCR API response:', result);

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      if (!result.ParsedResults || result.ParsedResults.length === 0) {
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

      return {
        success: true,
        extractedText
      };

    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      return {
        success: false,
        extractedText: '',
        error: error.message || 'OCR extraction failed'
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
}
