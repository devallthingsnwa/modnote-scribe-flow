
export class TextUtils {
  static readonly CONTEXT_WINDOW = 2000;

  static extractPhrases(query: string): string[] {
    const phrases: string[] = [];
    const words = query.split(/\s+/);
    
    // Extract 2-word and 3-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(words.slice(i, i + 2).join(' '));
      if (i < words.length - 2) {
        phrases.push(words.slice(i, i + 3).join(' '));
      }
    }
    
    return phrases.filter(phrase => phrase.length > 5);
  }

  static calculateProximityScore(content: string, queryWords: string[]): number {
    if (queryWords.length < 2) return 0;
    
    let proximityScore = 0;
    const words = content.split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i].toLowerCase();
      const word2 = words[i + 1].toLowerCase();
      
      const word1Match = queryWords.some(q => word1.includes(q));
      const word2Match = queryWords.some(q => word2.includes(q));
      
      if (word1Match && word2Match) {
        proximityScore += 0.5;
      }
    }
    
    return Math.min(proximityScore, 1.0);
  }

  static extractKeyTerms(content: string, query: string): string[] {
    if (!content) return [];
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    const keyTerms = new Set<string>();
    
    contentWords.forEach((word, index) => {
      if (queryWords.some(q => word.includes(q) || q.includes(word))) {
        // Add surrounding words as key terms
        for (let i = Math.max(0, index - 2); i <= Math.min(contentWords.length - 1, index + 2); i++) {
          if (contentWords[i].length > 3) {
            keyTerms.add(contentWords[i]);
          }
        }
      }
    });
    
    return Array.from(keyTerms).slice(0, 5);
  }

  static generateEnhancedSnippet(content: string, query: string): string {
    if (!content) return 'No content available';
    
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Find the best match position
    let bestIndex = -1;
    let bestScore = 0;
    
    const queryWords = queryLower.split(/\s+/);
    
    for (let i = 0; i < content.length - 100; i++) {
      const snippet = contentLower.substring(i, i + 200);
      const score = queryWords.reduce((acc, word) => 
        acc + (snippet.includes(word) ? 1 : 0), 0
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    
    if (bestIndex !== -1) {
      const start = Math.max(0, bestIndex - 50);
      const end = Math.min(content.length, bestIndex + 200);
      return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
    }
    
    return content.substring(0, 180) + (content.length > 180 ? '...' : '');
  }

  static generateContextOptimizedSnippet(content: string, query: string): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Find sentences with highest query word density
    const scoredSentences = sentences.map(sentence => {
      const sentenceLower = sentence.toLowerCase();
      const matchCount = queryWords.reduce((count, word) => 
        count + (sentenceLower.includes(word) ? 1 : 0), 0
      );
      
      return {
        sentence: sentence.trim(),
        score: matchCount / queryWords.length,
        length: sentence.length
      };
    }).filter(s => s.score > 0);
    
    if (scoredSentences.length === 0) {
      return content.substring(0, 150) + '...';
    }
    
    // Select best sentences within context window
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let snippet = '';
    let totalLength = 0;
    
    for (const sentenceData of scoredSentences) {
      if (totalLength + sentenceData.length > this.CONTEXT_WINDOW) break;
      
      if (snippet) snippet += ' ';
      snippet += sentenceData.sentence;
      totalLength += sentenceData.length;
    }
    
    return snippet || content.substring(0, 150) + '...';
  }

  static calculateTopicRelevance(content: string, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    
    const termFrequency = new Map<string, number>();
    contentWords.forEach(word => {
      termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
    });
    
    let relevanceScore = 0;
    queryTerms.forEach(term => {
      const frequency = termFrequency.get(term) || 0;
      relevanceScore += frequency / contentWords.length;
    });
    
    return Math.min(relevanceScore * 10, 1.0);
  }
}
