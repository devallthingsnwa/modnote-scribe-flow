
import { EnhancedSearchResult } from '../types';
import { TextUtils } from '../textUtils';
import { PineconeService } from '../pineconeService';

export class SemanticSearchStrategy {
  static async execute(notes: any[], query: string): Promise<EnhancedSearchResult[]> {
    try {
      const vectorResults = await PineconeService.semanticSearch(query, 12);
      
      return vectorResults.map(result => ({
        id: result.noteId,
        title: result.title,
        content: result.content,
        relevance: result.similarity,
        snippet: TextUtils.generateEnhancedSnippet(result.content, query),
        sourceType: result.sourceType,
        metadata: {
          source_url: result.metadata?.noteId,
          created_at: result.metadata?.createdAt,
          is_transcription: result.sourceType === 'video',
          similarity: result.similarity,
          contentLength: result.content?.length || 0,
          keyTerms: TextUtils.extractKeyTerms(result.content, query),
          searchMethod: 'semantic'
        }
      }));
    } catch (error) {
      console.warn('Semantic search failed:', error);
      return [];
    }
  }
}
