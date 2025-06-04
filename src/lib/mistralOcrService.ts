
import { supabase } from '@/integrations/supabase/client';

interface MistralOcrResponse {
  success: boolean;
  processedContent: string;
  error?: string;
  usage?: any;
  model?: string;
}

export class MistralOcrService {
  /**
   * Process OCR-extracted text using Mistral AI for better structure and data extraction
   */
  static async processExtractedText(
    extractedText: string,
    fileName: string,
    fileType: string
  ): Promise<MistralOcrResponse> {
    try {
      console.log('🤖 Processing OCR text with Mistral AI:', fileName);

      const { data, error } = await supabase.functions.invoke('mistral-ocr-processor', {
        body: {
          extractedText,
          fileName,
          fileType
        }
      });

      if (error) {
        console.error('❌ Mistral OCR processing error:', error);
        throw new Error(error.message || 'Failed to process with Mistral AI');
      }

      if (!data) {
        throw new Error('No response data from Mistral OCR processor');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ Mistral AI processing completed successfully');

      return {
        success: true,
        processedContent: data.processedContent,
        usage: data.usage,
        model: data.model
      };

    } catch (error) {
      console.error('❌ Mistral OCR service error:', error);
      return {
        success: false,
        processedContent: '',
        error: error.message || 'Failed to process document with Mistral AI'
      };
    }
  }

  /**
   * Check if text is suitable for Mistral AI processing
   */
  static shouldProcessWithMistral(text: string): boolean {
    // Process if text is substantial enough and likely to benefit from AI enhancement
    return text.length > 100 && text.length < 50000; // Reasonable limits
  }
}
