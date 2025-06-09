
import { OCRService as BaseOCRService } from "../ocrService";
import { MistralOCRProcessor } from "../mistral/mistralOCRProcessor";
import { PDFTextExtractor } from "./pdfTextExtractor";

export interface EnhancedOCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  method: 'pdf-text' | 'mistral-ocr' | 'fallback-ocr';
  metadata?: {
    pageCount?: number;
    language?: string;
    imageQuality?: string;
  };
}

export class EnhancedOCRService {
  static async extractTextWithMistral(file: File): Promise<EnhancedOCRResult> {
    const startTime = performance.now();
    console.log(`🔍 ENHANCED OCR: Processing file "${file.name}" with Mistral AI`);

    try {
      // Handle PDF files
      if (PDFTextExtractor.isPDFFile(file)) {
        console.log('📄 PDF DETECTED: Using enhanced PDF extraction');
        
        const extractedText = await PDFTextExtractor.extractTextFromPDF(file);
        
        if (extractedText && extractedText.length > 50) {
          // Enhance PDF text with Mistral
          const enhancedText = await MistralOCRProcessor.enhanceExtractedText(extractedText);
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
        } else {
          // If PDF text extraction fails, convert to image and use Mistral OCR
          console.log('📄 PDF appears to be scanned, using Mistral OCR');
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
        }
      }

      // Handle image files with Mistral OCR
      if (this.isImageFile(file)) {
        console.log('🖼️ IMAGE DETECTED: Using Mistral AI OCR');
        
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
      }

      throw new Error(`Unsupported file type: ${file.type}`);

    } catch (error) {
      console.error('🚨 ENHANCED OCR ERROR:', error);
      
      // Fallback to base OCR service
      try {
        console.log('🔄 FALLBACK: Using base OCR service');
        const fallbackResult = await BaseOCRService.extractTextFromFile(file, 'eng', false);
        const processingTime = performance.now() - startTime;
        
        if (fallbackResult.success && fallbackResult.text) {
          return {
            text: fallbackResult.text,
            confidence: 0.6, // Lower confidence for fallback
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

      // Final error handling
      return {
        text: `Unable to extract text from "${file.name}". The file may be corrupted or in an unsupported format.`,
        confidence: 0,
        processingTime: performance.now() - startTime,
        method: 'fallback-ocr',
        metadata: { language: 'en' }
      };
    }
  }

  private static async convertPDFToImage(file: File): Promise<string> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
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
    if (/[ä-ß]/i.test(text)) return 'de';
    if (/[ñáéíóú]/i.test(text)) return 'es';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f]/.test(text) || /[\u30a0-\u30ff]/.test(text)) return 'ja';
    return 'en';
  }
}
