
interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
  sourceType: 'video' | 'note';
  metadata?: {
    source_url?: string;
    created_at?: string;
    is_transcription?: boolean;
  };
}

export class OptimizedSearchService {
  private static searchCache = new Map<string, SearchResult[]>();
  private static readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  private static readonly MIN_SEARCH_LENGTH = 2;
  private static readonly MAX_RESULTS = 6; // Reduced for better precision
  private static readonly MIN_RELEVANCE_SCORE = 0.15; // Higher threshold

  static searchNotes(notes: any[], query: string): SearchResult[] {
    if (!query || query.trim().length < this.MIN_SEARCH_LENGTH) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${normalizedQuery}_${notes.length}_${Date.now() % 10000}`;

    // Check cache first
    if (this.searchCache.has(normalizedQuery)) {
      console.log('🚀 Cache hit for search query:', normalizedQuery);
      return this.searchCache.get(normalizedQuery)!;
    }

    console.log(`🔍 ENHANCED SEARCH: Analyzing ${notes.length} notes for: "${normalizedQuery}"`);

    // Enhanced search with better precision and source verification
    const results = notes
      .map(note => this.calculateEnhancedRelevance(note, normalizedQuery))
      .filter(result => result.relevance > this.MIN_RELEVANCE_SCORE)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.MAX_RESULTS)
      .map(result => ({
        ...result,
        snippet: this.generateContextualSnippet(result.content || '', normalizedQuery),
        sourceType: result.metadata?.is_transcription ? 'video' as const : 'note' as const
      }));

    // Cache results with TTL
    this.searchCache.set(normalizedQuery, results);
    setTimeout(() => this.searchCache.delete(normalizedQuery), this.CACHE_TTL);

    console.log(`✅ SEARCH COMPLETE: ${results.length} high-quality results found`);
    results.forEach(r => console.log(`   - "${r.title}" (${r.sourceType}): ${r.relevance.toFixed(3)}`));

    return results;
  }

  private static calculateEnhancedRelevance(note: any, query: string): SearchResult {
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    
    // Extract meaningful search terms with better filtering
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'may', 'each', 'which', 'their', 'time', 'will', 'about', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'would', 'make', 'like', 'into', 'more', 'go', 'no', 'do', 'does', 'what', 'where', 'when', 'why', 'how']);
    
    const queryTerms = query
      .split(/\s+/)
      .filter(term => term.length > 2 && !stopWords.has(term))
      .slice(0, 8); // Limit terms

    if (queryTerms.length === 0) {
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        relevance: 0,
        snippet: '',
        sourceType: note.is_transcription ? 'video' : 'note',
        metadata: {
          source_url: note.source_url,
          created_at: note.created_at,
          is_transcription: note.is_transcription
        }
      };
    }

    let relevanceScore = 0;
    const maxPossibleScore = queryTerms.length * 5;

    // Title matching (highest priority with exact matching bonus)
    for (const term of queryTerms) {
      if (title.includes(term)) {
        relevanceScore += 5; // High weight for title
        
        // Bonus for exact word boundaries
        const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
        if (title.match(wordBoundaryRegex)) {
          relevanceScore += 2; // Exact word match bonus
        }
      }
    }

    // Content matching with position weighting
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      const matches = content.match(regex) || [];
      
      // Weight early occurrences more heavily
      let termScore = 0;
      matches.forEach((match, index) => {
        const position = content.indexOf(match.toLowerCase());
        let positionWeight = 1;
        
        if (position < 200) positionWeight = 2; // Very early in content
        else if (position < 1000) positionWeight = 1.5; // Early in content
        else if (position < 3000) positionWeight = 1; // Middle
        else positionWeight = 0.5; // Late in content
        
        termScore += positionWeight * (1 / (index + 1)); // Diminishing returns for multiple matches
      });
      
      relevanceScore += Math.min(termScore, 3); // Cap per term
    }

    // Exact phrase matching (significant bonus)
    if (title.includes(query)) {
      relevanceScore += 4; // High bonus for exact title match
    } else if (content.includes(query)) {
      relevanceScore += 3; // Good bonus for exact content match
    }

    // Source type bonus (videos often have more structured content)
    if (note.is_transcription && queryTerms.length > 1) {
      relevanceScore += 1; // Small bonus for video transcripts with complex queries
    }

    // Recency bonus for newer content
    if (note.created_at) {
      const daysSinceCreated = (Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        relevanceScore += 0.5; // Small bonus for recent content
      }
    }

    // Normalize score with stricter curve
    const normalizedScore = Math.min(relevanceScore / maxPossibleScore, 1);
    const finalScore = Math.pow(normalizedScore, 1.2); // Apply curve for better separation

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      relevance: finalScore,
      snippet: '', // Will be generated later
      sourceType: note.is_transcription ? 'video' : 'note',
      metadata: {
        source_url: note.source_url,
        created_at: note.created_at,
        is_transcription: note.is_transcription
      }
    };
  }

  private static generateContextualSnippet(content: string, query: string): string {
    if (!content) return 'No content available';

    const queryTerms = query.split(/\s+/).filter(term => term.length > 2);
    const contentLower = content.toLowerCase();
    
    // Find the best matching section with multiple term coverage
    let bestIndex = -1;
    let bestScore = 0;
    const sectionSize = 180;

    for (let i = 0; i < content.length - sectionSize; i += 30) {
      const section = contentLower.substring(i, i + sectionSize);
      let sectionScore = 0;
      
      // Score based on term coverage and proximity
      for (const term of queryTerms) {
        const termCount = (section.match(new RegExp(this.escapeRegex(term), 'gi')) || []).length;
        sectionScore += termCount * 2;
        
        // Bonus for multiple terms in same section
        if (termCount > 0) {
          sectionScore += 1;
        }
      }
      
      // Bonus for early position
      if (i < 500) sectionScore += 2;
      
      if (sectionScore > bestScore) {
        bestScore = sectionScore;
        bestIndex = i;
      }
    }

    let snippet = bestIndex >= 0 
      ? content.substring(bestIndex, bestIndex + sectionSize) 
      : content.substring(0, sectionSize);

    // Clean up snippet
    snippet = snippet.replace(/\n{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
    
    // Add ellipsis appropriately
    if (bestIndex > 0) snippet = '...' + snippet;
    if (bestIndex + sectionSize < content.length) snippet = snippet + '...';

    return snippet;
  }

  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 Enhanced search cache cleared');
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.searchCache.size,
      keys: Array.from(this.searchCache.keys())
    };
  }
}
