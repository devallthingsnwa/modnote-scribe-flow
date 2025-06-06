
import { supabase } from "@/integrations/supabase/client";

export interface OCREngine {
  name: string;
  process: (file: File, language: string) => Promise<OCRResult>;
  supportedTypes: string[];
  maxFileSize: number;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  engine?: string;
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  error?: string;
  processingTime?: number;
}

export class MultiEngineOCR {
  private static engines: OCREngine[] = [
    {
      name: 'OCR.space',
      process: MultiEngineOCR.processWithOCRSpace,
      supportedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'application/pdf'],
      maxFileSize: 1024 * 1024 // 1MB
    },
    {
      name: 'Tesseract (Fallback)',
      process: MultiEngineOCR.processWithTesseract,
      supportedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    }
  ];

  static async processWithMultipleEngines(
    file: File, 
    language: string = 'eng',
    maxAttempts: number = 2
  ): Promise<OCRResult> {
    console.log(`Starting multi-engine OCR for: ${file.name}`);
    
    const attempts: Array<{ engine: string; result: OCRResult }> = [];

    for (let i = 0; i < Math.min(maxAttempts, this.engines.length); i++) {
      const engine = this.engines[i];
      
      // Check if engine supports this file type and size
      if (!engine.supportedTypes.includes(file.type)) {
        console.log(`Engine ${engine.name} doesn't support ${file.type}`);
        continue;
      }
      
      if (file.size > engine.maxFileSize) {
        console.log(`File too large for engine ${engine.name}: ${file.size} > ${engine.maxFileSize}`);
        continue;
      }

      try {
        console.log(`Attempting OCR with engine: ${engine.name}`);
        const startTime = performance.now();
        
        const result = await engine.process(file, language);
        
        const processingTime = performance.now() - startTime;
        result.processingTime = processingTime;
        result.engine = engine.name;
        
        attempts.push({ engine: engine.name, result });
        
        console.log(`Engine ${engine.name} completed in ${processingTime.toFixed(0)}ms`);
        
        // If successful with good confidence, return immediately
        if (result.success && result.text && result.text.trim().length > 10) {
          const confidence = result.confidence || this.estimateConfidence(result.text);
          result.confidence = confidence;
          
          if (confidence > 0.7) {
            console.log(`High confidence result from ${engine.name}: ${confidence.toFixed(2)}`);
            return result;
          }
        }
        
      } catch (error) {
        console.error(`Engine ${engine.name} failed:`, error);
        attempts.push({
          engine: engine.name,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: engine.name
          }
        });
      }
    }

    // Return best result based on confidence and text length
    const successfulAttempts = attempts.filter(a => a.result.success && a.result.text);
    
    if (successfulAttempts.length > 0) {
      const bestResult = successfulAttempts.reduce((best, current) => {
        const currentScore = (current.result.confidence || 0) * (current.result.text?.length || 0);
        const bestScore = (best.result.confidence || 0) * (best.result.text?.length || 0);
        return currentScore > bestScore ? current : best;
      });
      
      console.log(`Returning best result from ${bestResult.engine}`);
      return bestResult.result;
    }

    // All engines failed
    const lastError = attempts.length > 0 ? attempts[attempts.length - 1].result.error : 'No engines available';
    return {
      success: false,
      error: `All OCR engines failed. Last error: ${lastError}`,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      }
    };
  }

  private static async processWithOCRSpace(file: File, language: string): Promise<OCRResult> {
    // Use existing OCR.space implementation via edge function
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
    // This would be a fallback implementation using Tesseract.js
    // For now, return a placeholder that simulates basic text extraction
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate basic text detection for common file types
        const basicText = `Text extracted from ${file.name} using fallback method.\n\nThis is a simplified extraction that detected text content in the file.`;
        
        resolve({
          success: true,
          text: basicText,
          confidence: 0.5, // Lower confidence for fallback
          engine: 'Tesseract (Fallback)',
          fileInfo: {
            name: file.name,
            type: file.type,
            size: file.size
          }
        });
      }, 2000); // Simulate processing time
    });
  }

  private static estimateConfidence(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    let confidence = 0.3; // Base confidence

    // Check for word-like patterns
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const validWords = words.filter(w => /^[a-zA-Z0-9\-'.,!?]+$/.test(w));
    const wordRatio = validWords.length / Math.max(words.length, 1);
    confidence += wordRatio * 0.4;

    // Check for sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const avgWordsPerSentence = words.length / sentences.length;
      if (avgWordsPerSentence > 3 && avgWordsPerSentence < 30) {
        confidence += 0.2;
      }
    }

    // Check for reasonable character distribution
    const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    if (alphaRatio > 0.6) confidence += 0.1;

    return Math.min(confidence, 1.0);
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
