
import { SemanticSearchEngine } from "@/lib/vectorSearch/semanticSearchEngine";

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
    similarity?: number;
  };
}

export class SemanticSearchService {
  private static readonly MIN_SIMILARITY_THRESHOLD = 0.7;
  private static readonly MAX_RESULTS = 8;
  
  static async performSemanticSearch(
    notes: any[], 
    query: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { maxResults = this.MAX_RESULTS, minSimilarity = this.MIN_SIMILARITY_THRESHOLD } = options;
    
    if (!query.trim()) return [];
    
    console.log(`🧠 SEMANTIC SEARCH: "${query}" using vector similarity`);
    const searchStart = performance.now();
    
    try {
      const results = await SemanticSearchEngine.searchNotes(notes, query);
      
      const filteredResults = results
        .filter(result => result.relevance >= minSimilarity)
        .slice(0, maxResults);
      
      const searchTime = performance.now() - searchStart;
      console.log(`⚡ SEMANTIC SEARCH COMPLETE: ${searchTime.toFixed(1)}ms, ${filteredResults.length} results`);
      
      return filteredResults;
    } catch (error) {
      console.error('❌ Semantic search error:', error);
      return [];
    }
  }
  
  static async indexNote(noteId: string, title: string, content: string, sourceType: 'video' | 'note'): Promise<boolean> {
    try {
      return await SemanticSearchEngine.indexNote(noteId, title, content, sourceType);
    } catch (error) {
      console.error('Error indexing note:', error);
      return false;
    }
  }
  
  static async removeNoteIndex(noteId: string): Promise<boolean> {
    try {
      return await SemanticSearchEngine.removeNoteIndex(noteId);
    } catch (error) {
      console.error('Error removing note index:', error);
      return false;
    }
  }
}
