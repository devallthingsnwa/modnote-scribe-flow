
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
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += `\n--- Page ${i} ---\n${pageText}\n`;
        }
      }
      
      console.log(`PDF text extraction completed. Extracted ${fullText.length} characters from ${pdf.numPages} pages`);
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      // Instead of throwing an error, return empty string to trigger OCR fallback
      console.log('PDF text extraction failed, will fall back to OCR processing');
      return '';
    }
  }
  
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}
