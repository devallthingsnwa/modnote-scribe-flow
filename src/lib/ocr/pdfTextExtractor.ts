
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('Extracting text from PDF:', file.name);
    
    try {
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker with better fallback strategy
      await this.configureWorker(pdfjsLib);
      
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF with enhanced configuration
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: false,
        verbosity: 0 // Reduce console noise
      });
      
      // Set a timeout for PDF loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout after 15 seconds')), 15000);
      });
      
      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
      
      let fullText = '';
      
      // Extract text from each page with improved formatting
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Process text items with better positioning
          const textItems = textContent.items.filter((item: any): item is any => 
            item && typeof item === 'object' && 'str' in item && 'transform' in item && item.str !== undefined
          );
          
          if (textItems.length === 0) {
            console.log(`Page ${i} has no text content`);
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
            fullText += `${pageText.trim()}\n\n`;
          }
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${i}:`, pageError);
          // Continue with other pages instead of failing completely
        }
      }
      
      // Clean up the extracted text
      fullText = this.cleanupExtractedText(fullText.trim());
      
      if (!fullText || fullText.length < 10) {
        console.log('PDF appears to contain no extractable text or is image-based');
        return '';
      }
      
      console.log(`PDF text extraction completed. Extracted ${fullText.length} characters from ${pdf.numPages} pages`);
      return fullText;
      
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      
      // Provide specific error feedback
      if (error instanceof Error) {
        if (error.message?.includes('timeout')) {
          console.log('PDF extraction timed out');
        } else if (error.message?.includes('worker') || error.message?.includes('fetch')) {
          console.log('PDF.js worker configuration failed');
        } else {
          console.log('PDF processing error:', error.message);
        }
      }
      
      // Return empty string to trigger fallback or show appropriate message
      return '';
    }
  }
  
  private static async configureWorker(pdfjsLib: any): Promise<void> {
    try {
      // Try multiple worker sources with version fallbacks
      const workerSources = [
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.js`,
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js',
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js'
      ];
      
      for (const workerSrc of workerSources) {
        try {
          // Test if the worker URL is accessible
          const response = await fetch(workerSrc, { method: 'HEAD' });
          if (response.ok) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            console.log(`PDF.js worker configured with: ${workerSrc}`);
            return;
          }
        } catch (error) {
          console.warn(`Failed to load worker from ${workerSrc}:`, error);
        }
      }
      
      // If all external workers fail, disable worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
      console.warn('All PDF.js workers failed, running without worker (slower)');
      
    } catch (error) {
      console.error('Worker configuration failed:', error);
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    }
  }
  
  private static cleanupExtractedText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive line breaks but preserve paragraph structure
      .replace(/\n{4,}/g, '\n\n\n')
      // Remove trailing spaces
      .replace(/[ \t]+$/gm, '')
      // Normalize spacing around punctuation
      .replace(/\s*([.!?])\s*/g, '$1 ')
      // Fix broken words at line ends (basic dehyphenation)
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
      // Preserve bullet points and lists
      .replace(/^\s*([•·-])\s*/gm, '$1 ')
      // Remove extra spaces but preserve intentional formatting
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
  
  static isPDFFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}
