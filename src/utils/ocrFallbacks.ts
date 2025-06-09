
import { OCRService } from "@/lib/ocrService";
import { PDFTextExtractor } from "@/lib/ocr/pdfTextExtractor";

export interface FallbackResult {
  success: boolean;
  text?: string;
  method: 'edge-function' | 'pdf-extraction' | 'client-tesseract' | 'enhanced-ocr' | 'none';
  confidence?: number;
  processingTime: number;
  error?: string;
  fallbacksAttempted: string[];
}

/**
 * OCR Fallback System with multiple extraction methods
 */
export class OCRFallbackSystem {
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
  
  /**
   * Extract text using multiple fallback methods
   */
  static async extractWithFallbacks(file: File, language: string = 'eng'): Promise<FallbackResult> {
    const startTime = Date.now();
    const fallbacksAttempted: string[] = [];
    
    console.log(`🔄 Starting fallback extraction for: ${file.name}`);
    
    // Method 1: Try Enhanced OCR (Edge Function + OCR.space)
    try {
      console.log('🚀 Attempting Enhanced OCR (Edge Function)...');
      fallbacksAttempted.push('Enhanced OCR');
      
      const result = await OCRService.extractTextFromFile(file, language, true);
      
      if (result.success && result.text && result.text.trim().length > 10) {
        return {
          success: true,
          text: result.text,
          method: 'edge-function',
          confidence: this.parseConfidence(result.confidence),
          processingTime: Date.now() - startTime,
          fallbacksAttempted
        };
      }
      
      console.log('⚠️ Enhanced OCR failed or returned insufficient text');
    } catch (error) {
      console.warn('Enhanced OCR failed:', error);
    }
    
    // Method 2: Try PDF Text Extraction (for PDFs only)
    if (PDFTextExtractor.isPDFFile(file)) {
      try {
        console.log('📄 Attempting PDF text extraction...');
        fallbacksAttempted.push('PDF Text Extraction');
        
        const text = await PDFTextExtractor.extractTextFromPDF(file);
        
        if (text && text.trim().length > 20) {
          return {
            success: true,
            text,
            method: 'pdf-extraction',
            confidence: 0.9,
            processingTime: Date.now() - startTime,
            fallbacksAttempted
          };
        }
        
        console.log('⚠️ PDF text extraction returned insufficient text');
      } catch (error) {
        console.warn('PDF text extraction failed:', error);
      }
    }
    
    // Method 3: Try Client-side Tesseract with retries
    try {
      console.log('🔍 Attempting client-side Tesseract OCR...');
      fallbacksAttempted.push('Client-side Tesseract');
      
      const result = await this.extractWithTesseractRetry(file, language);
      
      if (result.success && result.text && result.text.trim().length > 5) {
        return {
          success: true,
          text: result.text,
          method: 'client-tesseract',
          confidence: result.confidence || 0.7,
          processingTime: Date.now() - startTime,
          fallbacksAttempted
        };
      }
      
      console.log('⚠️ Client-side Tesseract failed or returned insufficient text');
    } catch (error) {
      console.warn('Client-side Tesseract failed:', error);
    }
    
    // Method 4: Try Basic OCR as last resort
    try {
      console.log('🔧 Attempting basic OCR as last resort...');
      fallbacksAttempted.push('Basic OCR');
      
      const result = await OCRService.extractTextFromFile(file, language, false);
      
      if (result.success && result.text && result.text.trim().length > 0) {
        return {
          success: true,
          text: result.text,
          method: 'enhanced-ocr',
          confidence: this.parseConfidence(result.confidence),
          processingTime: Date.now() - startTime,
          fallbacksAttempted
        };
      }
    } catch (error) {
      console.warn('Basic OCR failed:', error);
    }
    
    // All methods failed
    console.error('❌ All OCR fallback methods failed');
    
    return {
      success: false,
      method: 'none',
      processingTime: Date.now() - startTime,
      error: 'All OCR methods failed to extract text from the file',
      fallbacksAttempted
    };
  }
  
  /**
   * Extract text using Tesseract with retry logic
   */
  private static async extractWithTesseractRetry(file: File, language: string, retryCount = 0): Promise<{ success: boolean; text?: string; confidence?: number }> {
    try {
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(file, language, {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            console.log(`Tesseract progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      });
      
      const text = result.data.text.trim();
      const confidence = result.data.confidence / 100;
      
      if (text.length === 0 && retryCount < this.RETRY_DELAYS.length) {
        console.log(`🔄 Tesseract returned empty text, retrying... (${retryCount + 1})`);
        await this.delay(this.RETRY_DELAYS[retryCount]);
        return this.extractWithTesseractRetry(file, language, retryCount + 1);
      }
      
      return {
        success: text.length > 0,
        text,
        confidence
      };
    } catch (error) {
      if (retryCount < this.RETRY_DELAYS.length) {
        console.log(`🔄 Tesseract error, retrying... (${retryCount + 1})`);
        await this.delay(this.RETRY_DELAYS[retryCount]);
        return this.extractWithTesseractRetry(file, language, retryCount + 1);
      }
      
      throw error;
    }
  }
  
  /**
   * Parse confidence from string or number
   */
  private static parseConfidence(confidence?: string | number): number {
    if (typeof confidence === 'number') {
      return confidence;
    }
    
    if (typeof confidence === 'string') {
      const numericValue = parseFloat(confidence.replace('%', ''));
      return isNaN(numericValue) ? 0.5 : numericValue / 100;
    }
    
    return 0.5; // Default confidence
  }
  
  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Determine the best extraction method for a file type
   */
  static getBestMethodForFile(file: File): string[] {
    const methods: string[] = [];
    
    if (PDFTextExtractor.isPDFFile(file)) {
      methods.push('PDF Text Extraction', 'Enhanced OCR', 'Client-side Tesseract');
    } else if (this.isImageFile(file)) {
      methods.push('Enhanced OCR', 'Client-side Tesseract');
    } else {
      methods.push('Enhanced OCR');
    }
    
    return methods;
  }
  
  /**
   * Check if file is an image
   */
  private static isImageFile(file: File): boolean {
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'];
    return imageTypes.includes(file.type) || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
  }
  
  /**
   * Get recommendations based on file type and previous results
   */
  static getOptimizationRecommendations(file: File, previousResults?: FallbackResult[]): string[] {
    const recommendations: string[] = [];
    
    if (file.size > 5 * 1024 * 1024) {
      recommendations.push('Consider compressing large files for better performance');
    }
    
    if (this.isImageFile(file)) {
      recommendations.push('For images: Ensure high contrast and clear text');
      recommendations.push('Avoid rotated or skewed text when possible');
    }
    
    if (PDFTextExtractor.isPDFFile(file)) {
      recommendations.push('For PDFs: Text-based PDFs work better than scanned images');
    }
    
    if (previousResults?.some(r => !r.success)) {
      recommendations.push('Try different image preprocessing settings');
      recommendations.push('Ensure the image has good quality and lighting');
    }
    
    return recommendations;
  }
}
