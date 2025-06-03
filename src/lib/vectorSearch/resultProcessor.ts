
import { EnhancedSearchResult } from './types';
import { TextUtils } from './textUtils';

export class ResultProcessor {
  static optimizeForContext(results: EnhancedSearchResult[], query: string): EnhancedSearchResult[] {
    return results.map(result => {
      if (!result.content) return result;
      
      // Generate context-optimized snippet
      const optimizedSnippet = TextUtils.generateContextOptimizedSnippet(result.content, query);
      
      return {
        ...result,
        snippet: optimizedSnippet,
        metadata: {
          ...result.metadata,
          topicRelevance: TextUtils.calculateTopicRelevance(result.content, query)
        }
      };
    });
  }

  static reRankResults(results: EnhancedSearchResult[], query: string): EnhancedSearchResult[] {
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
}
