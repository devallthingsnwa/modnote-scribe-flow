
import { supabase } from "@/integrations/supabase/client";

interface MistralOCRResult {
  extractedText: string;
  confidence: number;
  processingTime: number;
  metadata?: {
    language?: string;
    textRegions?: number;
    imageQuality?: 'high' | 'medium' | 'low';
  };
}

export class MistralOCRProcessor {
  static async processImageWithMistral(
    imageBase64: string,
    fileName: string,
    options: {
      language?: string;
      enhanceText?: boolean;
      extractStructure?: boolean;
    } = {}
  ): Promise<MistralOCRResult> {
    const startTime = performance.now();
    
    try {
      console.log(`🔍 MISTRAL OCR: Processing image "${fileName}" with advanced AI`);

      const systemPrompt = `You are an advanced OCR system powered by Mistral AI. Extract ALL text from the provided image with high accuracy.

INSTRUCTIONS:
1. Extract ALL visible text exactly as it appears
2. Preserve formatting, line breaks, and structure
3. Handle multiple languages if present
4. Identify tables, lists, and structured content
5. Maintain reading order (top to bottom, left to right)
6. Include headers, footers, captions, and annotations
7. Preserve special characters and symbols

${options.extractStructure ? 'STRUCTURE: Identify and preserve document structure (headings, paragraphs, lists, tables)' : ''}
${options.language ? `LANGUAGE: Primary language is ${options.language}` : 'LANGUAGE: Auto-detect and handle multiple languages'}

OUTPUT FORMAT: Return only the extracted text, preserving original formatting and structure.`;

      const { data, error } = await supabase.functions.invoke('mistral-ocr-processor', {
        body: {
          model: 'pixtral-12b-2409',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all text from this image: ${fileName}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        }
      });

      if (error) {
        throw new Error(`Mistral OCR error: ${error.message}`);
      }

      const extractedText = data.choices[0]?.message?.content || '';
      
      if (!extractedText.trim()) {
        throw new Error('No text extracted from image');
      }

      const processingTime = performance.now() - startTime;
      
      console.log(`✅ MISTRAL OCR SUCCESS: Extracted ${extractedText.length} characters in ${processingTime.toFixed(0)}ms`);

      return {
        extractedText: extractedText.trim(),
        confidence: this.calculateConfidence(extractedText),
        processingTime,
        metadata: {
          language: this.detectLanguage(extractedText),
          textRegions: this.countTextRegions(extractedText),
          imageQuality: this.assessImageQuality(extractedText)
        }
      };

    } catch (error) {
      console.error('🚨 MISTRAL OCR ERROR:', error);
      throw new Error(`Mistral OCR failed: ${error.message}`);
    }
  }

  static async enhanceExtractedText(text: string): Promise<string> {
    try {
      console.log('🔧 MISTRAL: Enhancing extracted text with AI cleanup');

      const { data, error } = await supabase.functions.invoke('mistral-text-enhancement', {
        body: {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: `You are a text enhancement AI. Clean up and improve OCR-extracted text while preserving all original information.

TASKS:
1. Fix OCR errors and typos
2. Restore proper formatting and structure
3. Correct spacing and line breaks
4. Fix punctuation and capitalization
5. Preserve technical terms, numbers, and proper nouns
6. Maintain document structure (headings, lists, tables)

RULES:
- Do NOT add new information
- Do NOT change meaning or context
- Do NOT remove any content
- Fix obvious OCR errors only
- Preserve original language and style`
            },
            {
              role: 'user',
              content: `Clean up this OCR text:\n\n${text}`
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        }
      });

      if (error || !data?.choices?.[0]?.message?.content) {
        console.warn('Text enhancement failed, returning original text');
        return text;
      }

      const enhancedText = data.choices[0].message.content;
      
      console.log('✅ MISTRAL: Text enhancement completed');
      return enhancedText;

    } catch (error) {
      console.warn('Text enhancement failed:', error);
      return text;
    }
  }

  private static calculateConfidence(text: string): number {
    let confidence = 0.5;
    
    if (text.length > 100) confidence += 0.2;
    if (text.length > 500) confidence += 0.1;
    
    if (/[.!?]/.test(text)) confidence += 0.1;
    if (/[A-Z]/.test(text)) confidence += 0.05;
    if (/\n/.test(text)) confidence += 0.05;
    
    if (/[}{|\\@#$%^&*]/.test(text)) confidence -= 0.1;
    if (/\d{10,}/.test(text)) confidence -= 0.05;
    
    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  private static detectLanguage(text: string): string {
    if (/[а-яё]/i.test(text)) return 'ru';
    if (/[à-ÿ]/i.test(text)) return 'fr';
    if (/[äöüß]/i.test(text)) return 'de';
    if (/[ñáéíóú]/i.test(text)) return 'es';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f]/.test(text) || /[\u30a0-\u30ff]/.test(text)) return 'ja';
    return 'en';
  }

  private static countTextRegions(text: string): number {
    return text.split(/\n\s*\n/).filter(region => region.trim()).length;
  }

  private static assessImageQuality(text: string): 'high' | 'medium' | 'low' {
    const confidence = this.calculateConfidence(text);
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }
}
