
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('Extracting text from PDF:', file.name);
    
    try {
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Try to set worker source with fallback options
      try {
        // First try the standard CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      } catch (error) {
        console.warn('Failed to set primary worker source, trying fallback');
        try {
          // Fallback to unpkg CDN
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
        } catch (fallbackError) {
          console.warn('Failed to set fallback worker source, using local worker');
          // Use local worker as last resort
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from each page with formatting preservation
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Sort text items by position (top to bottom, left to right)
        const sortedItems = textContent.items.sort((a: any, b: any) => {
          // Sort by Y position first (top to bottom)
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) return yDiff > 0 ? 1 : -1;
          // Then by X position (left to right)
          return a.transform[4] - b.transform[4];
        });
        
        let pageText = '';
        let lastY = null;
        let lastX = null;
        
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
      
      console.log(`PDF text extraction completed. Extracted ${fullText.length} characters from ${pdf.numPages} pages with formatting preserved`);
      
      return fullText;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      // Instead of throwing an error, return empty string to trigger OCR fallback
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
