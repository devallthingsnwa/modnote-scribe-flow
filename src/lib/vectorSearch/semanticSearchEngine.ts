
import { PineconeService } from './pineconeService';

interface SemanticSearchResult {
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

export class SemanticSearchEngine {
  private static readonly MIN_SIMILARITY_THRESHOLD = 0.7;
  private static readonly MAX_RESULTS = 8;
  
  static async searchNotes(
    notes: any[], 
    query: string
  ): Promise<SemanticSearchResult[]> {
    if (!query.trim()) return [];
    
    console.log(`🧠 SEMANTIC SEARCH: "${query}" using vector similarity`);
    const searchStart = performance.now();
    
    try {
      // Perform semantic search using Pinecone
      const vectorResults = await PineconeService.semanticSearch(query, 20);
      
      if (vectorResults.length === 0) {
        console.log('⚠️ No semantic matches found, falling back to keyword search');
        return this.fallbackKeywordSearch(notes, query);
      }
      
      // Filter by similarity threshold and map to expected format
      const semanticResults = vectorResults
        .filter(result => result.similarity >= this.MIN_SIMILARITY_THRESHOLD)
        .slice(0, this.MAX_RESULTS)
        .map(result => ({
          id: result.noteId,
          title: result.title,
          content: result.content,
          relevance: result.similarity,
          snippet: this.generateSnippet(result.content, query),
          sourceType: result.sourceType,
          metadata: {
            source_url: result.metadata?.noteId, // We'll need to fetch full note data if needed
            created_at: result.metadata?.createdAt,
            is_transcription: result.sourceType === 'video',
            similarity: result.similarity
          }
        }));
      
      const searchTime = performance.now() - searchStart;
      console.log(`⚡ SEMANTIC SEARCH COMPLETE: ${searchTime.toFixed(1)}ms, ${semanticResults.length} results`);
      
      return semanticResults;
    } catch (error) {
      console.error('❌ Semantic search error:', error);
      console.log('🔄 Falling back to keyword search');
      return this.fallbackKeywordSearch(notes, query);
    }
  }
  
  private static fallbackKeywordSearch(notes: any[], query: string): SemanticSearchResult[] {
    const queryLower = query.toLowerCase();
    
    return notes
      .map(note => {
        const titleLower = (note.title || '').toLowerCase();
        const contentLower = (note.content || '').toLowerCase();
        
        let relevance = 0;
        
        // Title matching
        if (titleLower.includes(queryLower)) {
          relevance += 0.8;
        }
        
        // Content matching
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
        for (const word of queryWords) {
          if (titleLower.includes(word)) relevance += 0.3;
          if (contentLower.includes(word)) relevance += 0.1;
        }
        
        if (relevance < 0.3) return null;
        
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          relevance: Math.min(relevance, 1.0),
          snippet: this.generateSnippet(note.content || note.title, query),
          sourceType: note.is_transcription ? 'video' as const : 'note' as const,
          metadata: {
            source_url: note.source_url,
            created_at: note.created_at,
            is_transcription: note.is_transcription,
            channel_name: note.channel_name,
            video_id: note.video_id
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance)
      .slice(0, this.MAX_RESULTS) as SemanticSearchResult[];
  }
  
  private static generateSnippet(content: string, query: string): string {
    if (!content) return 'No content available';
    
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(content.length, queryIndex + query.length + 50);
      return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
    }
    
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  }
  
  static async indexNote(noteId: string, title: string, content: string, sourceType: 'video' | 'note'): Promise<boolean> {
    try {
      const result = await PineconeService.upsertNoteVectors(noteId, title, content, sourceType);
      if (result.success) {
        console.log(`✅ Note indexed in Pinecone: ${title}`);
        return true;
      } else {
        console.error(`❌ Failed to index note: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error indexing note:', error);
      return false;
    }
  }
  
  static async removeNoteIndex(noteId: string): Promise<boolean> {
    try {
      const result = await PineconeService.deleteNoteVectors(noteId);
      if (result.success) {
        console.log(`✅ Note removed from Pinecone index: ${noteId}`);
        return true;
      } else {
        console.error(`❌ Failed to remove note index: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Error removing note index:', error);
      return false;
    }
  }
}
