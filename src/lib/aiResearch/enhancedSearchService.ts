
import { MetadataValidator } from './metadataValidator';
import { QueryIntentAnalyzer, QueryIntent } from './queryIntentAnalyzer';

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
    channel_name?: string;
    video_id?: string;
  };
  validationScore?: number;
  validationReasons?: string[];
}

export class EnhancedSearchService {
  private static searchCache = new Map<string, SearchResult[]>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MIN_SEARCH_LENGTH = 3;
  private static readonly MAX_RESULTS = 5;
  private static readonly VALIDATION_THRESHOLD = 0.7; // High threshold for accuracy

  static searchNotes(notes: any[], query: string): SearchResult[] {
    if (!query || query.trim().length < this.MIN_SEARCH_LENGTH) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `enhanced_${normalizedQuery}_${notes.length}`;

    // Check cache
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      console.log(`🎯 CACHE HIT: ${cached.length} validated results for: "${normalizedQuery}"`);
      return cached;
    }

    console.log(`🔍 ENHANCED SEARCH: Processing ${notes.length} notes with strict validation for: "${normalizedQuery}"`);

    // Analyze query intent first
    const queryIntent = QueryIntentAnalyzer.analyzeQuery(query);
    console.log(`📊 Query Intent:`, queryIntent);

    // Multi-stage filtering process
    const results = notes
      .map(note => this.scoreAndValidateNote(note, query, queryIntent))
      .filter(result => {
        if (!result) return false;
        
        // Apply strict validation threshold
        const passesValidation = result.validationScore && result.validationScore >= this.VALIDATION_THRESHOLD;
        
        if (!passesValidation) {
          console.log(`❌ FILTERED: "${result.title}" - validation score ${result.validationScore?.toFixed(3)} below ${this.VALIDATION_THRESHOLD}`);
          console.log(`   Reasons: ${result.validationReasons?.join(', ')}`);
        }
        
        return passesValidation;
      })
      .sort((a, b) => {
        // Sort by validation score first, then relevance
        const aScore = (a.validationScore || 0) * 0.7 + a.relevance * 0.3;
        const bScore = (b.validationScore || 0) * 0.7 + b.relevance * 0.3;
        return bScore - aScore;
      })
      .slice(0, this.MAX_RESULTS)
      .map(result => ({
        ...result,
        snippet: this.generatePreciseSnippet(result.content || '', query, queryIntent),
        sourceType: result.metadata?.is_transcription ? 'video' as const : 'note' as const
      }));

    // Cache with TTL
    this.searchCache.set(cacheKey, results);
    setTimeout(() => this.searchCache.delete(cacheKey), this.CACHE_TTL);

    console.log(`✅ ENHANCED SEARCH COMPLETE: ${results.length} validated results`);
    results.forEach(r => console.log(`   🎯 "${r.title}" (${r.sourceType}): validation ${r.validationScore?.toFixed(3)}, relevance ${r.relevance.toFixed(3)}`));

    return results;
  }

  private static scoreAndValidateNote(note: any, query: string, intent: QueryIntent): SearchResult | null {
    // Basic relevance scoring
    const basicRelevance = this.calculateBasicRelevance(note, query);
    
    if (basicRelevance < 0.1) {
      return null; // Skip obviously irrelevant content
    }

    // Metadata validation
    const metadataValidation = MetadataValidator.validateContentRelevance(
      { title: note.title, metadata: note },
      query,
      true // strict mode
    );

    // Intent validation
    const intentValidation = QueryIntentAnalyzer.validateContentAgainstIntent(
      intent,
      { title: note.title, metadata: note }
    );

    // Video-specific validation if applicable
    let videoValidation = { isValid: true, confidence: 1.0, issues: [] };
    if (note.is_transcription) {
      videoValidation = MetadataValidator.validateVideoContent(
        note.title,
        note,
        query
      );
    }

    // Combine validation scores
    const combinedValidationScore = Math.min(
      metadataValidation.confidence,
      intentValidation.score,
      videoValidation.confidence
    );

    const allReasons = [
      metadataValidation.reason,
      ...intentValidation.reasons,
      ...videoValidation.issues
    ];

    // Only return results that pass all validations
    if (!metadataValidation.isValid || !intentValidation.matches || !videoValidation.isValid) {
      return null;
    }

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      relevance: basicRelevance,
      snippet: '', // Generated later
      sourceType: note.is_transcription ? 'video' : 'note',
      metadata: {
        source_url: note.source_url,
        created_at: note.created_at,
        is_transcription: note.is_transcription,
        channel_name: note.channel_name,
        video_id: note.video_id
      },
      validationScore: combinedValidationScore,
      validationReasons: allReasons
    };
  }

  private static calculateBasicRelevance(note: any, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.content || '').toLowerCase();

    let score = 0;

    // Title exact phrase match (highest priority)
    if (titleLower.includes(queryLower)) {
      score += 1.0;
    }

    // Title word matches
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 3);
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        score += 0.3;
      }
    }

    // Content matches (lower priority)
    for (const word of queryWords) {
      const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      if (contentMatches > 0) {
        score += Math.min(contentMatches * 0.1, 0.3);
      }
    }

    // Channel name boost for video content
    if (note.channel_name) {
      const channelLower = note.channel_name.toLowerCase();
      if (queryLower.includes(channelLower) || channelLower.includes(queryLower)) {
        score += 0.5;
      }
    }

    return Math.min(score, 1.0);
  }

  private static generatePreciseSnippet(content: string, query: string, intent: QueryIntent): string {
    if (!content) return 'No content available';

    const queryTerms = intent.primaryEntities.length > 0 ? intent.primaryEntities : query.split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find best section containing query entities
    let bestIndex = -1;
    let bestScore = 0;
    const sectionSize = 200;

    for (let i = 0; i < content.length - sectionSize; i += 50) {
      const section = contentLower.substring(i, i + sectionSize);
      let sectionScore = 0;
      
      for (const term of queryTerms) {
        const termLower = term.toLowerCase();
        const matches = (section.match(new RegExp(this.escapeRegex(termLower), 'gi')) || []).length;
        sectionScore += matches;
      }
      
      if (sectionScore > bestScore) {
        bestScore = sectionScore;
        bestIndex = i;
      }
    }

    let snippet = bestIndex >= 0 
      ? content.substring(bestIndex, bestIndex + sectionSize)
      : content.substring(0, sectionSize);

    // Clean snippet
    snippet = snippet
      .replace(/\n{2,}/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Add ellipsis
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
