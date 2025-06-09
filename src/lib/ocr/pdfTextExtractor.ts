
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('Extracting text from PDF:', file.name);
    
    try {
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use a more robust worker setup with multiple fallbacks
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        const version = pdfjsLib.version || '4.4.168';
        const workerSources = [
          // Try the exact version first
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.js`,
          // Fallback to unpkg with exact version
          `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`,
          // Fallback to a known working version
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js',
          // Last resort - latest stable
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js'
        ];
        
        let workerLoaded = false;
        for (const workerSrc of workerSources) {
          try {
            console.log(`Trying PDF.js worker: ${workerSrc}`);
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            
            // Test if the worker loads by trying to create a small document
            const testArray = new Uint8Array([37, 80, 68, 70]); // "%PDF" header
            await pdfjsLib.getDocument({ data: testArray }).promise.catch(() => {}); // Ignore test error
            
            workerLoaded = true;
            console.log(`Successfully set PDF.js worker: ${workerSrc}`);
            break;
          } catch (error) {
            console.warn(`Failed to set worker source: ${workerSrc}`, error);
            continue;
          }
        }
        
        if (!workerLoaded) {
          throw new Error('Failed to load PDF.js worker from any source');
        }
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0,
        // Add timeout and error handling
        disableFontFace: false,
        disableRange: false,
        disableStream: false
      }).promise;
      
      let fullText = '';
      
      // Extract text from each page with enhanced error handling
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Filter and sort text items by position
          const textItems = textContent.items.filter((item: any): item is any => 
            item && typeof item === 'object' && 'str' in item && 'transform' in item && item.str !== undefined
          );
          
          const sortedItems = textItems.sort((a: any, b: any) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 5) return yDiff > 0 ? 1 : -1;
            return a.transform[4] - b.transform[4];
          });
          
          let pageText = '';
          let lastY: number | null = null;
          let lastX: number | null = null;
          
          for (const item of sortedItems) {
            if (!item.str.trim()) continue;
            
            const currentY = item.transform[5];
            const currentX = item.transform[4];
            
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
              pageText += '\n';
              if (Math.abs(currentY - lastY) > 15) {
                pageText += '\n';
              }
            } else if (lastX !== null && currentX - lastX > 20) {
              pageText += '  ';
            } else if (lastX !== null && currentX > lastX && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            
            pageText += item.str;
            lastY = currentY;
            lastX = currentX + (item.width || 0);
          }
          
          if (pageText.trim()) {
            fullText += `\n--- Page ${i} ---\n${pageText.trim()}\n`;
          }
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${i}:`, pageError);
          fullText += `\n--- Page ${i} (extraction failed) ---\n`;
        }
      }
      
      fullText = this.cleanupFormattedText(fullText.trim());
      
      console.log(`PDF text extraction completed. Extracted ${fullText.length} characters from ${pdf.numPages} pages`);
      
      return fullText;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      // Return empty string to trigger OCR fallback instead of throwing
      return '';
    }
  }
  
  private static cleanupFormattedText(text: string): string {
    return text
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\s*([.!?])\s*/g, '$1 ')
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
      .replace(/^\s*([•·-])\s*/gm, '$1 ')
      .trim();
  }
  
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}
