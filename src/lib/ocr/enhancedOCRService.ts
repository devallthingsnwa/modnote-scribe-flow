
import { OCRService as BaseOCRService } from "../ocrService";
import { MistralOCRProcessor } from "../mistral/mistralOCRProcessor";
import { PDFTextExtractor } from "./pdfTextExtractor";

export interface EnhancedOCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  method: 'pdf-text' | 'mistral-ocr' | 'fallback-ocr' | 'basic-extraction';
  metadata?: {
    pageCount?: number;
    language?: string;
    imageQuality?: string;
    errorDetails?: string;
  };
}

export class EnhancedOCRService {
  static async extractTextWithMistral(file: File): Promise<EnhancedOCRResult> {
    const startTime = performance.now();
    console.log(`🔍 ENHANCED OCR: Processing file "${file.name}" with multiple extraction methods`);

    try {
      // Handle PDF files with enhanced error handling
      if (PDFTextExtractor.isPDFFile(file)) {
        console.log('📄 PDF DETECTED: Using enhanced PDF extraction');
        
        try {
          const extractedText = await PDFTextExtractor.extractTextFromPDF(file);
          
          if (extractedText && extractedText.length > 50) {
            // Try to enhance PDF text with Mistral if available
            let enhancedText = extractedText;
            try {
              enhancedText = await MistralOCRProcessor.enhanceExtractedText(extractedText);
            } catch (enhanceError) {
              console.warn('Mistral enhancement failed, using original text:', enhanceError);
            }
            
            const processingTime = performance.now() - startTime;
            
            return {
              text: enhancedText,
              confidence: 0.9,
              processingTime,
              method: 'pdf-text',
              metadata: {
                language: this.detectLanguage(enhancedText)
              }
            };
          }
        } catch (pdfError) {
          console.warn('PDF text extraction failed:', pdfError);
        }
        
        // If PDF text extraction fails, try Mistral OCR
        console.log('📄 PDF text extraction failed, trying Mistral OCR');
        try {
          const imageData = await this.convertPDFToImage(file);
          const ocrResult = await MistralOCRProcessor.processImageWithMistral(
            imageData,
            file.name,
            { enhanceText: true, extractStructure: true }
          );
          
          return {
            text: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            processingTime: ocrResult.processingTime,
            method: 'mistral-ocr',
            metadata: ocrResult.metadata
          };
        } catch (mistralError) {
          console.warn('Mistral OCR failed for PDF:', mistralError);
        }
      }

      // Handle image files
      if (this.isImageFile(file)) {
        console.log('🖼️ IMAGE DETECTED: Using Mistral AI OCR');
        
        try {
          const imageData = await this.fileToBase64(file);
          const ocrResult = await MistralOCRProcessor.processImageWithMistral(
            imageData,
            file.name,
            { enhanceText: true, extractStructure: true }
          );
          
          return {
            text: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            processingTime: ocrResult.processingTime,
            method: 'mistral-ocr',
            metadata: ocrResult.metadata
          };
        } catch (mistralError) {
          console.warn('Mistral OCR failed for image:', mistralError);
        }
      }

      // Fallback to basic OCR service
      console.log('🔄 FALLBACK: Using basic OCR service');
      try {
        const fallbackResult = await BaseOCRService.extractTextFromFile(file, 'eng', false);
        const processingTime = performance.now() - startTime;
        
        if (fallbackResult.success && fallbackResult.text) {
          return {
            text: fallbackResult.text,
            confidence: 0.6,
            processingTime,
            method: 'fallback-ocr',
            metadata: {
              language: this.detectLanguage(fallbackResult.text)
            }
          };
        }
      } catch (fallbackError) {
        console.error('🚨 FALLBACK OCR FAILED:', fallbackError);
      }

      // Final fallback - basic text extraction attempt
      console.log('🔧 FINAL FALLBACK: Basic text extraction');
      const processingTime = performance.now() - startTime;
      
      return {
        text: `Text extraction from "${file.name}" was unsuccessful. This may be due to:\n\n• The file is corrupted or in an unsupported format\n• The text is too faint or unclear\n• The OCR service is temporarily unavailable\n\nPlease try:\n• Using a higher quality image\n• Converting the file to a different format\n• Trying again later`,
        confidence: 0,
        processingTime,
        method: 'basic-extraction',
        metadata: { 
          language: 'en',
          errorDetails: 'All extraction methods failed'
        }
      };

    } catch (error) {
      console.error('🚨 ENHANCED OCR ERROR:', error);
      const processingTime = performance.now() - startTime;
      
      return {
        text: `Unable to process "${file.name}". Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        processingTime,
        method: 'basic-extraction',
        metadata: { 
          language: 'en',
          errorDetails: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private static async convertPDFToImage(file: File): Promise<string> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use the same worker setup as PDFTextExtractor
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context!,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      return canvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      throw new Error('Failed to convert PDF to image for OCR processing');
    }
  }

  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private static isImageFile(file: File): boolean {
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'];
    return imageTypes.includes(file.type) || /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name);
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
}
