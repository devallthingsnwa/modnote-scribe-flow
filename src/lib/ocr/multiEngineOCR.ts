
import { supabase } from "@/integrations/supabase/client";

export interface OCREngine {
  name: string;
  process: (file: File, language: string) => Promise<OCRResult>;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
  provider?: string;
}

export class MultiEngineOCR {
  private static engines: OCREngine[] = [
    {
      name: 'OCR.space',
      process: async (file: File, language: string) => {
        return await this.processWithOCRSpace(file, language);
      }
    },
    {
      name: 'Tesseract (Fallback)',
      process: async (file: File, language: string) => {
        return await this.processWithTesseract(file, language);
      }
    }
  ];

  static async processWithMultipleEngines(file: File, language: string): Promise<OCRResult> {
    console.log('Using multi-engine OCR approach');
    console.log(`Starting multi-engine OCR for: ${file.name}`);
    
    for (const engine of this.engines) {
      try {
        console.log(`Attempting OCR with engine: ${engine.name}`);
        const startTime = Date.now();
        
        const result = await engine.process(file, language);
        const duration = Date.now() - startTime;
        
        if (result.success && result.text && result.text.trim().length > 0) {
          console.log(`Engine ${engine.name} completed in ${duration}ms`);
          console.log(`Returning best result from ${engine.name}`);
          return {
            ...result,
            provider: engine.name
          };
        }
        
        console.log(`Engine ${engine.name} failed or returned empty text`);
      } catch (error) {
        console.error(`Engine ${engine.name} failed:`, error);
        // Continue to next engine
      }
    }
    
    return {
      success: false,
      error: 'All OCR engines failed to extract text'
    };
  }

  private static async processWithOCRSpace(file: File, language: string): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
      body: formData,
    });

    if (error) {
      throw new Error(`OCR.space error: ${error.message}`);
    }

    return data as OCRResult;
  }

  private static async processWithTesseract(file: File, language: string): Promise<OCRResult> {
    try {
      // Import Tesseract dynamically to avoid bundle size issues
      const { recognize } = await import('tesseract.js');
      
      const { data: { text, confidence } } = await recognize(file, language, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      return {
        success: true,
        text,
        confidence: confidence / 100, // Convert to decimal
        provider: 'Tesseract'
      };
    } catch (error) {
      throw new Error(`Tesseract error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
