export interface PostProcessingOptions {
  removeExtraSpaces?: boolean;
  standardizeFormat?: boolean;
  removeSpecialChars?: boolean;
  fixLineBreaks?: boolean;
  preserveStructure?: boolean;
}

export class TextPostProcessor {
  static cleanText(text: string, options: PostProcessingOptions = {}): string {
    let cleaned = text;

    console.log('Original text length:', text.length);

    // Remove extra spaces and normalize whitespace
    if (options.removeExtraSpaces !== false) {
      cleaned = cleaned.replace(/\s+/g, ' ');
      cleaned = cleaned.replace(/\t+/g, ' ');
    }

    // Fix common OCR errors
    cleaned = this.fixCommonOCRErrors(cleaned);

    // Fix line breaks and paragraph structure
    if (options.fixLineBreaks !== false) {
      cleaned = this.fixLineBreaks(cleaned, options.preserveStructure);
    }

    // Remove unwanted special characters but preserve punctuation
    if (options.removeSpecialChars) {
      cleaned = cleaned.replace(/[^\w\s.,!?;:()\-"']/g, '');
    }

    // Standardize format
    if (options.standardizeFormat) {
      cleaned = this.standardizeFormat(cleaned);
    }

    // Final cleanup
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks

    console.log('Cleaned text length:', cleaned.length);
    console.log('Cleanup improvements applied');

    return cleaned;
  }

  private static fixCommonOCRErrors(text: string): string {
    const corrections: Array<[RegExp, string]> = [
      // Common character misrecognitions
      [/\b0(?=\w)/g, 'O'],  // 0 -> O at word boundaries
      [/\bl(?=\d)/g, '1'],  // l -> 1 before digits
      [/(?<=\d)l\b/g, '1'], // l -> 1 after digits
      [/\brn(?=\w)/g, 'm'], // rn -> m
      [/\bvv/g, 'w'],       // vv -> w
      [/\b5(?=[a-zA-Z])/g, 'S'], // 5 -> S before letters
      [/(?<=[a-zA-Z])5\b/g, 's'], // 5 -> s after letters
      
      // Fix punctuation spacing
      [/\s+([.,!?;:])/g, '$1'],    // Remove space before punctuation
      [/([.,!?;:])\s*([a-zA-Z])/g, '$1 $2'], // Add space after punctuation
      
      // Fix quotes
      [/``/g, '"'],
      [/''/g, '"'],
      [/`/g, "'"],
    ];

    let cleaned = text;
    corrections.forEach(([pattern, replacement]) => {
      cleaned = cleaned.replace(pattern, replacement);
    });

    return cleaned;
  }

  private static fixLineBreaks(text: string, preserveStructure: boolean = true): string {
    let cleaned = text;

    if (preserveStructure) {
      // Intelligent line break handling
      // Join lines that are likely part of the same sentence
      cleaned = cleaned.replace(/([a-z])\n([a-z])/g, '$1 $2');
      
      // Preserve paragraph breaks (double line breaks)
      cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
      
      // Fix broken words across lines
      cleaned = cleaned.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
    } else {
      // Simple line break normalization
      cleaned = cleaned.replace(/\n+/g, ' ');
    }

    return cleaned;
  }

  private static standardizeFormat(text: string): string {
    let standardized = text;

    // Normalize quotes
    standardized = standardized.replace(/[""]/g, '"');
    standardized = standardized.replace(/['']/g, "'");

    // Normalize dashes
    standardized = standardized.replace(/[—–]/g, '-');

    // Normalize ellipsis
    standardized = standardized.replace(/\.{3,}/g, '...');

    return standardized;
  }

  static extractTextStructure(text: string): {
    paragraphs: string[];
    sentences: string[];
    wordCount: number;
    confidence: number;
  } {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // Simple confidence calculation based on text structure
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
    const avgSentencesPerParagraph = sentences.length / Math.max(paragraphs.length, 1);
    
    // Higher confidence for well-structured text
    let confidence = 0.5;
    if (avgWordsPerSentence > 5 && avgWordsPerSentence < 25) confidence += 0.2;
    if (avgSentencesPerParagraph > 1 && avgSentencesPerParagraph < 10) confidence += 0.2;
    if (wordCount > 50) confidence += 0.1;

    return {
      paragraphs,
      sentences,
      wordCount,
      confidence: Math.min(confidence, 1.0)
    };
  }
}
