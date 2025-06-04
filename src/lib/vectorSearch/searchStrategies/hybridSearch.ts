
import { EnhancedSearchResult } from '../types';
import { SemanticSearchStrategy } from './semanticSearch';
import { KeywordSearchStrategy } from './keywordSearch';

export class HybridSearchStrategy {
  private static readonly HYBRID_THRESHOLD = 0.7;

  static async execute(notes: any[], query: string): Promise<EnhancedSearchResult[]> {
    try {
      // Run semantic and keyword searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        SemanticSearchStrategy.execute(notes, query),
        KeywordSearchStrategy.execute(notes, query)
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
      return KeywordSearchStrategy.execute(notes, query);
    }
  }
}
