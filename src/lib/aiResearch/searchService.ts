
interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
}

export class OptimizedSearchService {
  private static searchCache = new Map<string, SearchResult[]>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MIN_SEARCH_LENGTH = 2;
  private static readonly MAX_RESULTS = 8; // Reduced for better accuracy

  static searchNotes(notes: any[], query: string): SearchResult[] {
    if (!query || query.trim().length < this.MIN_SEARCH_LENGTH) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${normalizedQuery}_${notes.length}`;

    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      console.log('🚀 Cache hit for search query:', normalizedQuery);
      return this.searchCache.get(cacheKey)!;
    }

    console.log(`🔍 Searching ${notes.length} notes for: "${normalizedQuery}"`);

    // Enhanced search with better precision
    const results = notes
      .map(note => this.calculateSearchRelevance(note, normalizedQuery))
      .filter(result => result.relevance > 0.1) // Higher threshold
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.MAX_RESULTS)
      .map(result => ({
        ...result,
        snippet: this.generatePreciseSnippet(result.content || '', normalizedQuery)
      }));

    // Cache results with timestamp
    this.searchCache.set(cacheKey, results);
    setTimeout(() => this.searchCache.delete(cacheKey), this.CACHE_TTL);

    console.log(`✅ Found ${results.length} relevant search results`);
    return results;
  }

  private static calculateSearchRelevance(note: any, query: string): SearchResult {
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    
    // Extract search terms
    const queryTerms = query.split(/\s+/).filter(term => term.length > 1);
    let relevanceScore = 0;
    const maxPossibleScore = queryTerms.length * 4;

    // Title matching (highest priority)
    for (const term of queryTerms) {
      if (title.includes(term)) {
        relevanceScore += 4; // High weight for title
      }
    }

    // Content matching (medium priority)
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      const matches = content.match(regex) || [];
      relevanceScore += Math.min(matches.length * 0.5, 2); // Cap content contribution
    }

    // Exact phrase matching (bonus)
    if (title.includes(query)) {
      relevanceScore += 3;
    } else if (content.includes(query)) {
      relevanceScore += 2;
    }

    // Normalize score
    const normalizedScore = Math.min(relevanceScore / maxPossibleScore, 1);

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      relevance: normalizedScore,
      snippet: '' // Will be generated later
    };
  }

  private static generatePreciseSnippet(content: string, query: string): string {
    if (!content) return 'No content available';

    const queryTerms = query.split(/\s+/).filter(term => term.length > 1);
    const contentLower = content.toLowerCase();
    
    // Find the best matching section
    let bestIndex = -1;
    let bestScore = 0;

    for (let i = 0; i < content.length - 200; i += 50) {
      const section = contentLower.substring(i, i + 200);
      let sectionScore = 0;
      
      for (const term of queryTerms) {
        const matches = (section.match(new RegExp(this.escapeRegex(term), 'gi')) || []).length;
        sectionScore += matches;
      }
      
      if (sectionScore > bestScore) {
        bestScore = sectionScore;
        bestIndex = i;
      }
    }

    let snippet = bestIndex >= 0 
      ? content.substring(bestIndex, bestIndex + 200) 
      : content.substring(0, 200);

    // Clean up snippet
    snippet = snippet.replace(/\n{2,}/g, ' ').trim();
    
    if (snippet.length === 200 && bestIndex >= 0) {
      snippet = '...' + snippet + '...';
    } else if (snippet.length === 200) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 Search cache cleared');
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.searchCache.size,
      keys: Array.from(this.searchCache.keys())
    };
  }
}
