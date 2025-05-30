
interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
  matchType: 'title' | 'content' | 'both';
}

export class OptimizedSearchService {
  private static searchCache = new Map<string, SearchResult[]>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_RESULTS = 8;

  static searchNotes(notes: any[], query: string): SearchResult[] {
    if (!notes?.length || !query.trim()) return [];

    const cacheKey = `${query.toLowerCase()}_${notes.length}`;
    const cached = this.searchCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const results = this.performSearch(notes, query);
    
    // Cache results with TTL
    this.searchCache.set(cacheKey, results);
    setTimeout(() => this.searchCache.delete(cacheKey), this.CACHE_TTL);
    
    return results;
  }

  private static performSearch(notes: any[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 1);
    
    const results = notes
      .map(note => {
        const titleLower = note.title.toLowerCase();
        const contentLower = note.content?.toLowerCase() || '';
        
        let relevance = 0;
        let matchType: 'title' | 'content' | 'both' = 'content';
        
        // Exact phrase matching (highest priority)
        if (titleLower.includes(queryLower)) {
          relevance += 10;
          matchType = 'title';
        }
        if (contentLower.includes(queryLower)) {
          relevance += 5;
          matchType = matchType === 'title' ? 'both' : 'content';
        }
        
        // Individual term matching
        const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length;
        const contentMatches = queryTerms.filter(term => contentLower.includes(term)).length;
        
        relevance += titleMatches * 3;
        relevance += contentMatches * 1;
        
        // Boost for term proximity in content
        if (contentMatches > 1 && note.content) {
          const proximityBoost = this.calculateProximityScore(note.content, queryTerms);
          relevance += proximityBoost;
        }
        
        if (relevance === 0) return null;
        
        const snippet = this.generateSnippet(note.content || '', queryTerms);
        
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          relevance,
          snippet,
          matchType
        } as SearchResult;
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance)
      .slice(0, this.MAX_RESULTS) as SearchResult[];
    
    return results;
  }

  private static calculateProximityScore(content: string, terms: string[]): number {
    const contentLower = content.toLowerCase();
    let proximityScore = 0;
    
    for (let i = 0; i < terms.length - 1; i++) {
      const term1Index = contentLower.indexOf(terms[i]);
      const term2Index = contentLower.indexOf(terms[i + 1]);
      
      if (term1Index !== -1 && term2Index !== -1) {
        const distance = Math.abs(term2Index - term1Index);
        if (distance < 100) { // Within 100 characters
          proximityScore += Math.max(0, 50 - distance) / 50;
        }
      }
    }
    
    return proximityScore;
  }

  private static generateSnippet(content: string, queryTerms: string[]): string {
    if (!content) return '';
    
    const contentLower = content.toLowerCase();
    let bestStart = 0;
    let bestScore = 0;
    
    // Find the best 150-character window containing query terms
    for (let i = 0; i <= content.length - 150; i += 25) {
      const window = contentLower.substring(i, i + 150);
      const score = queryTerms.reduce((acc, term) => 
        acc + (window.includes(term) ? 1 : 0), 0
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }
    
    let snippet = content.substring(bestStart, bestStart + 150);
    
    // Ensure we don't cut words
    if (bestStart > 0) {
      const spaceIndex = snippet.indexOf(' ');
      if (spaceIndex > 0) snippet = snippet.substring(spaceIndex + 1);
      snippet = '...' + snippet;
    }
    
    if (bestStart + 150 < content.length) {
      const lastSpace = snippet.lastIndexOf(' ');
      if (lastSpace > 0) snippet = snippet.substring(0, lastSpace);
      snippet += '...';
    }
    
    return snippet;
  }

  static clearCache(): void {
    this.searchCache.clear();
  }
}
