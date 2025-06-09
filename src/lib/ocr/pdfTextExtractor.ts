
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('Extracting text from PDF:', file.name);
    
    try {
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set up worker with better fallback strategy
      try {
        // First try to use a more reliable CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js worker set to CDNJS version');
      } catch (workerError) {
        console.warn('Failed to set PDF.js worker from CDNJS, trying JSDelivr');
        try {
          // Fallback to JSDelivr
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          console.log('PDF.js worker set to JSDelivr version');
        } catch (fallbackError) {
          console.warn('All CDN workers failed, using legacy mode');
          // Use legacy mode without worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = null;
        }
      }
      
      const arrayBuffer = await file.arrayBuffer();
      
      // Add better error handling and timeout for PDF loading
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        verbosity: 0 // Reduce console noise
      });
      
      // Set a reasonable timeout for PDF loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout after 15 seconds')), 15000);
      });
      
      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]) as any;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      // Extract text from each page with better error handling
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Process text items with better positioning logic
          const textItems = textContent.items.filter((item: any): item is any => 
            item && typeof item === 'object' && 'str' in item && item.str && item.str.trim()
          );
          
          if (textItems.length === 0) {
            console.warn(`Page ${i} contains no extractable text`);
            continue;
          }
          
          // Sort items by position (top to bottom, left to right)
          const sortedItems = textItems.sort((a: any, b: any) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 3) return yDiff > 0 ? 1 : -1;
            return a.transform[4] - b.transform[4];
          });
          
          let pageText = '';
          let lastY: number | null = null;
          
          for (const item of sortedItems) {
            const text = item.str.trim();
            if (!text) continue;
            
            const currentY = item.transform[5];
            
            // Add line breaks based on Y position changes
            if (lastY !== null && Math.abs(currentY - lastY) > 3) {
              pageText += '\n';
              // Add extra line break for larger gaps (paragraphs)
              if (Math.abs(currentY - lastY) > 10) {
                pageText += '\n';
              }
            } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            
            pageText += text;
            lastY = currentY;
          }
          
          if (pageText.trim()) {
            fullText += pageText.trim() + '\n\n';
          }
          
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${i}:`, pageError);
          // Continue with other pages instead of failing completely
        }
      }
      
      // Clean up the extracted text
      fullText = this.cleanupExtractedText(fullText.trim());
      
      if (!fullText || fullText.length < 10) {
        console.warn('Very little text extracted, PDF might be image-based');
        return '';
      }
      
      console.log(`PDF text extraction completed. Extracted ${fullText.length} characters from ${pdf.numPages} pages`);
      return fullText;
      
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message?.includes('timeout')) {
          console.log('PDF extraction timed out - PDF might be too large or complex');
        } else if (error.message?.includes('worker')) {
          console.log('PDF.js worker failed to load - network or compatibility issue');
        } else if (error.message?.includes('Invalid PDF')) {
          console.log('PDF file appears to be corrupted or invalid');
        } else {
          console.log('PDF text extraction failed with unknown error');
        }
      }
      
      // Return empty string to indicate text extraction failed
      return '';
    }
  }
  
  private static cleanupExtractedText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive whitespace but preserve paragraphs
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      // Clean up common PDF artifacts
      .replace(/\f/g, '\n') // Form feeds to line breaks
      .replace(/[\u00A0\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, ' ') // Various unicode spaces
      // Fix broken words
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
      // Remove trailing spaces
      .replace(/[ \t]+$/gm, '')
      .trim();
  }
  
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}
