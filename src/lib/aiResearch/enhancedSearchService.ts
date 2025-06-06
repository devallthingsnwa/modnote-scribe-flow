
import { OptimizedSearchService } from './searchService';
import { VectorService } from './vectorService';

interface HybridSearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  similarity?: number;
  snippet: string;
  sourceType: 'video' | 'note';
  searchType: 'keyword' | 'semantic' | 'hybrid';
  metadata?: any;
}

export class EnhancedSearchService {
  private static readonly HYBRID_WEIGHT_KEYWORD = 0.4;
  private static readonly HYBRID_WEIGHT_SEMANTIC = 0.6;

  static async hybridSearch(notes: any[], query: string): Promise<HybridSearchResult[]> {
    if (!query.trim() || notes.length === 0) {
      return [];
    }

    console.log(`🔍 HYBRID SEARCH: Keyword + Vector search for: "${query}"`);

    try {
      // Run both searches in parallel
      const [keywordResults, vectorResults] = await Promise.all([
        this.performKeywordSearch(notes, query),
        this.performVectorSearch(notes, query)
      ]);

      // Combine and deduplicate results
      const combinedResults = this.combineSearchResults(keywordResults, vectorResults, query);

      console.log(`✅ HYBRID SEARCH COMPLETE: ${combinedResults.length} results (keyword: ${keywordResults.length}, vector: ${vectorResults.length})`);

      return combinedResults;
    } catch (error) {
      console.error('🚨 Hybrid search failed, falling back to keyword search:', error);
      // Fallback to keyword search only
      return this.performKeywordSearch(notes, query);
    }
  }

  private static async performKeywordSearch(notes: any[], query: string): Promise<HybridSearchResult[]> {
    const keywordResults = OptimizedSearchService.searchNotes(notes, query);
    
    return keywordResults.map(result => ({
      ...result,
      searchType: 'keyword' as const,
      sourceType: result.sourceType
    }));
  }

  private static async performVectorSearch(notes: any[], query: string): Promise<HybridSearchResult[]> {
    try {
      const vectorResults = await VectorService.vectorSearch(query, notes);
      
      return vectorResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        relevance: result.similarity,
        similarity: result.similarity,
        snippet: this.generateSnippet(result.content, query),
        sourceType: result.metadata.type === 'transcript' ? 'video' as const : 'note' as const,
        searchType: 'semantic' as const,
        metadata: result.metadata
      }));
    } catch (error) {
      console.warn('⚠️ Vector search failed:', error);
      return [];
    }
  }

  private static combineSearchResults(
    keywordResults: HybridSearchResult[],
    vectorResults: HybridSearchResult[],
    query: string
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Add keyword results
    keywordResults.forEach(result => {
      resultMap.set(result.id, result);
    });

    // Add or merge vector results
    vectorResults.forEach(vectorResult => {
      const existing = resultMap.get(vectorResult.id);
      
      if (existing) {
        // Combine scores for hybrid ranking
        const hybridScore = 
          (existing.relevance * this.HYBRID_WEIGHT_KEYWORD) + 
          (vectorResult.similarity! * this.HYBRID_WEIGHT_SEMANTIC);
        
        resultMap.set(vectorResult.id, {
          ...existing,
          relevance: hybridScore,
          similarity: vectorResult.similarity,
          searchType: 'hybrid' as const,
          snippet: this.enhanceSnippet(existing.snippet, vectorResult.snippet)
        });
      } else {
        // Add semantic-only result
        resultMap.set(vectorResult.id, vectorResult);
      }
    });

    // Sort by relevance and return top results
    return Array.from(resultMap.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 6);
  }

  private static generateSnippet(content: string, query: string): string {
    if (!content) return 'No content available';
    
    const maxLength = 150;
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // Find the best section containing query terms
    let bestIndex = 0;
    let bestScore = 0;
    
    for (let i = 0; i < content.length - maxLength; i += 20) {
      const section = content.substring(i, i + maxLength).toLowerCase();
      const score = queryTerms.reduce((acc, term) => 
        acc + (section.includes(term) ? 1 : 0), 0
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    
    let snippet = content.substring(bestIndex, bestIndex + maxLength);
    if (bestIndex > 0) snippet = '...' + snippet;
    if (bestIndex + maxLength < content.length) snippet = snippet + '...';
    
    return snippet.trim();
  }

  private static enhanceSnippet(keywordSnippet: string, semanticSnippet: string): string {
    // Prefer the longer, more informative snippet
    return keywordSnippet.length > semanticSnippet.length ? keywordSnippet : semanticSnippet;
  }

  static clearCache(): void {
    OptimizedSearchService.clearCache();
    VectorService.clearCache();
    console.log('🧹 Enhanced search cache cleared');
  }
}
