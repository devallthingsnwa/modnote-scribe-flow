import { PineconeService } from './pineconeService';
import { SemanticSearchEngine } from './semanticSearchEngine';

interface EnhancedSearchResult {
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
    similarity?: number;
    contentLength?: number;
    keyTerms?: string[];
    topicRelevance?: number;
    searchMethod?: string;
  };
}

interface SearchStrategy {
  name: string;
  weight: number;
  execute: (query: string, notes: any[]) => Promise<EnhancedSearchResult[]>;
}

export class AdvancedSemanticEngine {
  private static readonly HYBRID_THRESHOLD = 0.7;
  private static readonly MAX_RESULTS = 8;
  private static readonly CONTEXT_WINDOW = 2000; // Characters for RAG context
  
  // Enhanced search cache with expiration
  private static searchCache = new Map<string, { 
    results: EnhancedSearchResult[]; 
    timestamp: number; 
    strategy: string;
    queryEmbedding?: number[];
  }>();
  private static readonly CACHE_DURATION = 45000; // 45 seconds
  
  static async enhancedSearch(
    notes: any[], 
    query: string,
    options: {
      useSemanticSearch?: boolean;
      useKeywordSearch?: boolean;
      hybridMode?: boolean;
      contextOptimization?: boolean;
    } = {}
  ): Promise<EnhancedSearchResult[]> {
    if (!query.trim()) return [];
    
    const {
      useSemanticSearch = true,
      useKeywordSearch = true,
      hybridMode = true,
      contextOptimization = true
    } = options;
    
    // Check enhanced cache
    const cacheKey = `${query.toLowerCase().trim()}_${JSON.stringify(options)}`;
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`⚡ ENHANCED CACHE HIT: ${cached.strategy}`);
      return cached.results;
    }
    
    console.log(`🧠 ENHANCED RAG SEARCH: "${query}" with hybrid strategies`);
    const searchStart = performance.now();
    
    try {
      let results: EnhancedSearchResult[] = [];
      let strategy = 'fallback';
      
      if (hybridMode && useSemanticSearch && useKeywordSearch) {
        results = await this.hybridSearch(notes, query);
        strategy = 'hybrid';
      } else if (useSemanticSearch) {
        results = await this.pureSemanticSearch(notes, query);
        strategy = 'semantic';
      } else {
        results = await this.enhancedKeywordSearch(notes, query);
        strategy = 'keyword';
      }
      
      // Apply context optimization
      if (contextOptimization) {
        results = this.optimizeForContext(results, query);
      }
      
      // Enhanced result scoring and ranking
      results = this.reRankResults(results, query);
      
      const searchTime = performance.now() - searchStart;
      
      // Cache with strategy info
      this.searchCache.set(cacheKey, { 
        results, 
        timestamp: Date.now(), 
        strategy 
      });
      
      // Clean old cache entries
      if (this.searchCache.size > 30) {
        const oldestKey = this.searchCache.keys().next().value;
        this.searchCache.delete(oldestKey);
      }
      
      console.log(`⚡ ENHANCED RAG COMPLETE: ${searchTime.toFixed(1)}ms, ${results.length} results via ${strategy}`);
      
      return results.slice(0, this.MAX_RESULTS);
    } catch (error) {
      console.error('❌ Enhanced RAG search error:', error);
      return this.enhancedKeywordSearch(notes, query);
    }
  }
  
  private static async hybridSearch(notes: any[], query: string): Promise<EnhancedSearchResult[]> {
    try {
      // Run semantic and keyword searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.pureSemanticSearch(notes, query),
        this.enhancedKeywordSearch(notes, query)
      ]);
      
      // Merge and deduplicate results with weighted scoring
      const mergedResults = new Map<string, EnhancedSearchResult>();
      
      // Add semantic results with higher weight for high-similarity matches
      semanticResults.forEach(result => {
        const boostedRelevance = result.relevance > this.HYBRID_THRESHOLD ? 
          result.relevance * 1.3 : result.relevance;
        
        mergedResults.set(result.id, {
          ...result,
          relevance: boostedRelevance,
          metadata: {
            ...result.metadata,
            searchMethod: 'semantic'
          }
        });
      });
      
      // Add keyword results, boosting if they're also in semantic results
      keywordResults.forEach(result => {
        const existing = mergedResults.get(result.id);
        if (existing) {
          // Boost hybrid matches
          existing.relevance = Math.min(1.0, existing.relevance + result.relevance * 0.3);
          existing.metadata = {
            ...existing.metadata,
            searchMethod: 'hybrid'
          };
        } else {
          mergedResults.set(result.id, {
            ...result,
            metadata: {
              ...result.metadata,
              searchMethod: 'keyword'
            }
          });
        }
      });
      
      return Array.from(mergedResults.values())
        .sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.warn('Hybrid search failed, falling back to keyword:', error);
      return this.enhancedKeywordSearch(notes, query);
    }
  }
  
  private static async pureSemanticSearch(notes: any[], query: string): Promise<EnhancedSearchResult[]> {
    try {
      const vectorResults = await PineconeService.semanticSearch(query, 12);
      
      return vectorResults.map(result => ({
        id: result.noteId,
        title: result.title,
        content: result.content,
        relevance: result.similarity,
        snippet: this.generateEnhancedSnippet(result.content, query),
        sourceType: result.sourceType,
        metadata: {
          source_url: result.metadata?.noteId,
          created_at: result.metadata?.createdAt,
          is_transcription: result.sourceType === 'video',
          similarity: result.similarity,
          contentLength: result.content?.length || 0,
          keyTerms: this.extractKeyTerms(result.content, query),
          searchMethod: 'semantic'
        }
      }));
    } catch (error) {
      console.warn('Semantic search failed:', error);
      return [];
    }
  }
  
  private static async enhancedKeywordSearch(notes: any[], query: string): Promise<EnhancedSearchResult[]> {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const queryPhrases = this.extractPhrases(queryLower);
    
    return notes
      .map(note => {
        const titleLower = (note.title || '').toLowerCase();
        const contentLower = (note.content || '').toLowerCase();
        
        let relevance = 0;
        
        // Exact phrase matching (highest weight)
        queryPhrases.forEach(phrase => {
          if (titleLower.includes(phrase)) relevance += 0.8;
          if (contentLower.includes(phrase)) relevance += 0.4;
        });
        
        // Word proximity scoring
        relevance += this.calculateProximityScore(contentLower, queryWords) * 0.3;
        
        // Individual word matching
        queryWords.forEach(word => {
          if (titleLower.includes(word)) relevance += 0.3;
          if (contentLower.includes(word)) relevance += 0.1;
        });
        
        // Content quality bonus
        if (note.content && note.content.length > 500) relevance += 0.1;
        if (note.is_transcription) relevance += 0.05;
        
        if (relevance < 0.15) return null;
        
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          relevance: Math.min(relevance, 1.0),
          snippet: this.generateEnhancedSnippet(note.content || note.title, query),
          sourceType: note.is_transcription ? 'video' as const : 'note' as const,
          metadata: {
            source_url: note.source_url,
            created_at: note.created_at,
            is_transcription: note.is_transcription,
            channel_name: note.channel_name,
            video_id: note.video_id,
            contentLength: note.content?.length || 0,
            keyTerms: this.extractKeyTerms(note.content, query),
            searchMethod: 'keyword'
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance) as EnhancedSearchResult[];
  }
  
  private static extractPhrases(query: string): string[] {
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
  
  private static calculateProximityScore(content: string, queryWords: string[]): number {
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
  
  private static extractKeyTerms(content: string, query: string): string[] {
    if (!content) return [];
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    // Find terms that appear near query words
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
  
  private static optimizeForContext(results: EnhancedSearchResult[], query: string): EnhancedSearchResult[] {
    return results.map(result => {
      if (!result.content) return result;
      
      // Generate context-optimized snippet
      const optimizedSnippet = this.generateContextOptimizedSnippet(result.content, query);
      
      return {
        ...result,
        snippet: optimizedSnippet,
        metadata: {
          ...result.metadata,
          topicRelevance: this.calculateTopicRelevance(result.content, query)
        }
      };
    });
  }
  
  private static generateContextOptimizedSnippet(content: string, query: string): string {
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
  
  private static calculateTopicRelevance(content: string, query: string): number {
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
  
  private static reRankResults(results: EnhancedSearchResult[], query: string): EnhancedSearchResult[] {
    return results.map(result => {
      let boostedRelevance = result.relevance;
      
      // Boost recent content
      if (result.metadata?.created_at) {
        const daysSinceCreation = (Date.now() - new Date(result.metadata.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) boostedRelevance += 0.1;
        else if (daysSinceCreation < 30) boostedRelevance += 0.05;
      }
      
      // Boost content with key terms
      if (result.metadata?.keyTerms && result.metadata.keyTerms.length > 3) {
        boostedRelevance += 0.05;
      }
      
      // Boost high topic relevance
      if (result.metadata?.topicRelevance && result.metadata.topicRelevance > 0.7) {
        boostedRelevance += 0.1;
      }
      
      return {
        ...result,
        relevance: Math.min(boostedRelevance, 1.0)
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }
  
  private static generateEnhancedSnippet(content: string, query: string): string {
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
  
  static clearCache(): void {
    this.searchCache.clear();
  }
  
  static getCacheStats(): { size: number; duration: number } {
    return {
      size: this.searchCache.size,
      duration: this.CACHE_DURATION
    };
  }
}
