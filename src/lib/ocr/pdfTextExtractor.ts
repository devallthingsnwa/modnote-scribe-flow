
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('Extracting text from PDF:', file.name);
    
    try {
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use a more reliable worker setup
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Try different worker sources in order of preference
        const workerSources = [
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
          // Fallback to a known stable version
          'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js'
        ];
        
        for (const workerSrc of workerSources) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            console.log(`Trying PDF.js worker: ${workerSrc}`);
            break;
          } catch (error) {
            console.warn(`Failed to set worker source: ${workerSrc}`, error);
            continue;
          }
        }
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0 // Reduce console noise
      }).promise;
      
      let fullText = '';
      
      // Extract text from each page with formatting preservation
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Filter and sort text items by position (top to bottom, left to right)
        const textItems = textContent.items.filter((item: any): item is any => 
          item && typeof item === 'object' && 'str' in item && 'transform' in item && item.str !== undefined
        );
        
        const sortedItems = textItems.sort((a: any, b: any) => {
          // Sort by Y position first (top to bottom)
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff > 0 ? 1 : -1;
          // Then by X position (left to right)
          return a.transform[4] - b.transform[4];
        });
        
        let pageText = '';
        let lastY: number | null = null;
        let lastX: number | null = null;
        
        for (const item of sortedItems) {
          if (!item.str.trim()) continue;
          
          const currentY = item.transform[5];
          const currentX = item.transform[4];
          
          // Check for line breaks based on Y position
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
            // Add extra line break for larger gaps (paragraphs)
            if (Math.abs(currentY - lastY) > 15) {
              pageText += '\n';
            }
          }
          // Check for spacing based on X position
          else if (lastX !== null && currentX - lastX > 20) {
            pageText += '  '; // Add spacing for horizontal gaps
          }
          // Add single space if items are close but not overlapping
          else if (lastX !== null && currentX > lastX && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          
          pageText += item.str;
          lastY = currentY;
          lastX = currentX + (item.width || 0);
        }
        
        if (pageText.trim()) {
          fullText += `\n--- Page ${i} ---\n${pageText.trim()}\n`;
        }
      }
      
      // Clean up the text while preserving intentional formatting
      fullText = this.cleanupFormattedText(fullText.trim());
      
      console.log(`PDF text extraction completed. Extracted ${fullText.length} characters from ${pdf.numPages} pages`);
      
      return fullText;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      // Return empty string to trigger OCR fallback
      console.log('PDF text extraction failed, will fall back to OCR processing');
      return '';
    }
  }
  
  private static cleanupFormattedText(text: string): string {
    return text
      // Remove excessive line breaks but preserve paragraph structure
      .replace(/\n{4,}/g, '\n\n\n')
      // Remove trailing spaces but preserve intentional spacing
      .replace(/[ \t]+$/gm, '')
      // Normalize spacing around punctuation
      .replace(/\s*([.!?])\s*/g, '$1 ')
      // Fix broken words at line ends
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
      // Preserve bullet points and lists
      .replace(/^\s*([•·-])\s*/gm, '$1 ')
      .trim();
  }
  
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}
