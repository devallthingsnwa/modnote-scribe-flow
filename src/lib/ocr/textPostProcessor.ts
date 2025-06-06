
export interface PostProcessingOptions {
  removeExtraSpaces: boolean;
  fixLineBreaks: boolean;
  preserveStructure: boolean;
}

export class TextPostProcessor {
  static processText(text: string, options: PostProcessingOptions): string {
    console.log('Applying text post-processing');
    console.log('Original text length:', text.length);
    
    let processedText = text;
    
    if (options.removeExtraSpaces) {
      processedText = this.removeExtraSpaces(processedText);
    }
    
    if (options.fixLineBreaks) {
      processedText = this.fixLineBreaks(processedText);
    }
    
    if (options.preserveStructure) {
      processedText = this.preserveStructure(processedText);
    }
    
    // Additional cleanup
    processedText = this.cleanupText(processedText);
    
    console.log('Cleaned text length:', processedText.length);
    
    if (processedText.length > text.length * 0.8) {
      console.log('Cleanup improvements applied');
    }
    
    return processedText;
  }
  
  private static removeExtraSpaces(text: string): string {
    return text
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/[ \t]*\n[ \t]*/g, '\n') // Remove spaces around line breaks
      .trim();
  }
  
  private static fixLineBreaks(text: string): string {
    return text
      .replace(/\n{3,}/g, '\n\n') // Multiple line breaks to double
      .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2') // Add space after sentences
      .replace(/([a-z])\n([A-Z])/g, '$1 $2'); // Join broken sentences
  }
  
  private static preserveStructure(text: string): string {
    // Preserve paragraph structure and formatting
    return text
      .replace(/^[\s\n]+/gm, '') // Remove leading whitespace from lines
      .replace(/[\s\n]+$/gm, '') // Remove trailing whitespace from lines
      .replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks
  }
  
  private static cleanupText(text: string): string {
    return text
      .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove special characters except common punctuation
      .replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure space after sentence endings
      .trim();
  }
}
