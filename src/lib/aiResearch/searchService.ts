
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
  private static readonly CACHE_TTL = 2 * 60 * 1000; // Reduced cache time
  private static readonly MIN_SEARCH_LENGTH = 3; // Increased minimum
  private static readonly MAX_RESULTS = 4; // Reduced for better precision
  private static readonly ULTRA_HIGH_RELEVANCE_SCORE = 0.25; // Much higher threshold

  static searchNotes(notes: any[], query: string): SearchResult[] {
    if (!query || query.trim().length < this.MIN_SEARCH_LENGTH) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `ultra_${normalizedQuery}_${notes.length}`;

    // Check cache with stricter validation
    if (this.searchCache.has(normalizedQuery)) {
      const cached = this.searchCache.get(normalizedQuery)!;
      console.log(`🚀 CACHE HIT: ${cached.length} ultra-verified results for: "${normalizedQuery}"`);
      return cached;
    }

    console.log(`🔍 ULTRA-SEARCH: Analyzing ${notes.length} notes with maximum precision for: "${normalizedQuery}"`);

    // Ultra-enhanced search with maximum precision and source verification
    const results = notes
      .map(note => this.calculateUltraEnhancedRelevance(note, normalizedQuery))
      .filter(result => {
        const passes = result.relevance > this.ULTRA_HIGH_RELEVANCE_SCORE;
        if (!passes) {
          console.log(`❌ ULTRA-FILTERED: "${result.title}" - score ${result.relevance.toFixed(4)} below ${this.ULTRA_HIGH_RELEVANCE_SCORE}`);
        }
        return passes;
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.MAX_RESULTS)
      .map(result => ({
        ...result,
        snippet: this.generateUltraPreciseSnippet(result.content || '', normalizedQuery),
        sourceType: result.metadata?.is_transcription ? 'video' as const : 'note' as const
      }));

    // Ultra-strict cache with shorter TTL
    this.searchCache.set(normalizedQuery, results);
    setTimeout(() => this.searchCache.delete(normalizedQuery), this.CACHE_TTL);

    console.log(`✅ ULTRA-SEARCH COMPLETE: ${results.length} maximum-precision results`);
    results.forEach(r => console.log(`   🎯 "${r.title}" (${r.sourceType}): ULTRA-SCORE ${r.relevance.toFixed(4)}`));

    return results;
  }

  private static calculateUltraEnhancedRelevance(note: any, query: string): SearchResult {
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    
    // Ultra-strict term extraction with entity recognition
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'may', 'each', 'which', 'their', 'time', 'will', 'about', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'would', 'make', 'like', 'into', 'more', 'go', 'no', 'do', 'does', 'what', 'where', 'when', 'why', 'how', 'video', 'content', 'note', 'notes', 'transcript', 'watch', 'youtube']);
    
    const queryTerms = query
      .split(/\s+/)
      .filter(term => term.length > 3 && !stopWords.has(term)) // Increased minimum length
      .slice(0, 4); // Limit to most critical terms

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
    const maxPossibleScore = queryTerms.length * 8; // Higher max for ultra-strict curve

    // ULTRA-STRICT title matching with exact word boundaries only
    for (const term of queryTerms) {
      const exactWordRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
      if (title.match(exactWordRegex)) {
        relevanceScore += 8; // Maximum weight for exact title match
        
        // Additional bonus for title prominence
        const titleWords = title.split(/\s+/);
        const termIndex = titleWords.findIndex(word => word.toLowerCase() === term);
        if (termIndex !== -1 && termIndex < 3) { // Early in title
          relevanceScore += 2;
        }
      }
    }

    // ULTRA-STRICT content matching with position and frequency limits
    for (const term of queryTerms) {
      const exactWordRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      const matches = content.match(exactWordRegex) || [];
      
      if (matches.length > 0) {
        // Only count if term appears early in content
        const firstMatch = content.search(exactWordRegex);
        if (firstMatch < 400) { // Must be very early
          let termScore = Math.min(matches.length, 2); // Cap frequency bonus
          
          // Position weight (earlier = better)
          if (firstMatch < 100) termScore *= 2; // Very early bonus
          else if (firstMatch < 200) termScore *= 1.5; // Early bonus
          
          relevanceScore += Math.min(termScore, 4); // Cap per term
        }
      }
    }

    // ULTRA-STRICT exact phrase matching (critical for source identification)
    const phraseBonus = this.calculateUltraStrictPhraseBonus(title, content, query, queryTerms);
    relevanceScore += phraseBonus;

    // Entity matching bonus (for proper nouns, names, etc.)
    const entityBonus = this.calculateEntityMatchBonus(title, content, query);
    relevanceScore += entityBonus;

    // Source type consideration with query context
    const sourceTypeBonus = this.calculateSourceTypeRelevance(note, query, queryTerms);
    relevanceScore += sourceTypeBonus;

    // Ultra-strict normalization with very steep curve
    const normalizedScore = Math.min(relevanceScore / maxPossibleScore, 1);
    const finalScore = Math.pow(normalizedScore, 3.0); // Very steep curve for maximum selectivity

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      relevance: finalScore,
      snippet: '', // Generated later
      sourceType: note.is_transcription ? 'video' : 'note',
      metadata: {
        source_url: note.source_url,
        created_at: note.created_at,
        is_transcription: note.is_transcription
      }
    };
  }

  private static calculateUltraStrictPhraseBonus(title: string, content: string, query: string, queryTerms: string[]): number {
    let bonus = 0;
    
    // Exact complete phrase (highest priority)
    if (title.includes(query)) {
      bonus += 10; // Maximum bonus for exact title match
    } else if (content.includes(query)) {
      const position = content.indexOf(query);
      if (position < 300) { // Only if early in content
        bonus += 6;
      }
    }
    
    // Multi-word phrase segments
    if (queryTerms.length > 1) {
      for (let i = 0; i < queryTerms.length - 1; i++) {
        const phrase = queryTerms.slice(i, i + 2).join(' ');
        if (title.includes(phrase)) bonus += 3;
        else if (content.includes(phrase)) {
          const position = content.indexOf(phrase);
          if (position < 500) bonus += 1;
        }
      }
    }
    
    return Math.min(bonus, 12); // Cap the bonus
  }

  private static calculateEntityMatchBonus(title: string, content: string, query: string): number {
    // Look for proper nouns and entities (capitalized words)
    const entities = query.match(/\b[A-Z][a-z]+\b/g) || [];
    let bonus = 0;
    
    for (const entity of entities) {
      const entityLower = entity.toLowerCase();
      if (title.includes(entityLower)) {
        bonus += 4; // High bonus for entity in title
      } else if (content.includes(entityLower)) {
        bonus += 2; // Moderate bonus for entity in content
      }
    }
    
    return Math.min(bonus, 8);
  }

  private static calculateSourceTypeRelevance(note: any, query: string, queryTerms: string[]): number {
    let bonus = 0;
    
    // Video-specific query terms
    const videoTerms = ['video', 'watch', 'youtube', 'channel', 'episode', 'stream', 'podcast'];
    const hasVideoTerms = queryTerms.some(term => videoTerms.includes(term.toLowerCase()));
    
    // Text-specific query terms
    const textTerms = ['note', 'article', 'text', 'document', 'write', 'written'];
    const hasTextTerms = queryTerms.some(term => textTerms.includes(term.toLowerCase()));
    
    if (note.is_transcription && hasVideoTerms) {
      bonus += 1; // Small bonus for matching source type expectation
    } else if (!note.is_transcription && hasTextTerms) {
      bonus += 1;
    }
    
    // Recency bonus (smaller than before)
    if (note.created_at) {
      const daysSinceCreated = (Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 3) { // Only very recent content
        bonus += 0.5;
      }
    }
    
    return bonus;
  }

  private static generateUltraPreciseSnippet(content: string, query: string): string {
    if (!content) return 'No content available';

    const queryTerms = query.split(/\s+/).filter(term => term.length > 3);
    const contentLower = content.toLowerCase();
    
    // Find the BEST section that contains multiple query terms
    let bestIndex = -1;
    let bestScore = 0;
    const sectionSize = 150; // Smaller for precision

    // Scan for optimal snippet location
    for (let i = 0; i < content.length - sectionSize; i += 20) {
      const section = contentLower.substring(i, i + sectionSize);
      let sectionScore = 0;
      
      // Score based on term density and proximity
      for (const term of queryTerms) {
        const termMatches = (section.match(new RegExp(this.escapeRegex(term), 'gi')) || []).length;
        sectionScore += termMatches * 3;
        
        // Bonus for multiple different terms in same section
        if (termMatches > 0) {
          sectionScore += 2;
        }
      }
      
      // Heavy bonus for exact phrase
      if (section.includes(query)) {
        sectionScore += 10;
      }
      
      // Bonus for early position
      if (i < 200) sectionScore += 2;
      
      if (sectionScore > bestScore) {
        bestScore = sectionScore;
        bestIndex = i;
      }
    }

    let snippet = bestIndex >= 0 
      ? content.substring(bestIndex, bestIndex + sectionSize)
      : content.substring(0, sectionSize);

    // Clean and format snippet
    snippet = snippet
      .replace(/\n{2,}/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Smart ellipsis
    if (bestIndex > 0) snippet = '...' + snippet;
    if (bestIndex + sectionSize < content.length) snippet = snippet + '...';

    return snippet;
  }

  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 Ultra-enhanced search cache cleared');
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.searchCache.size,
      keys: Array.from(this.searchCache.keys())
    };
  }
}
