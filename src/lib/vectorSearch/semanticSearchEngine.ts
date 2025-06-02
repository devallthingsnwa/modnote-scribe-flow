
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
  private static readonly MIN_SIMILARITY_THRESHOLD = 0.65; // Slightly lower for more results
  private static readonly MAX_RESULTS = 6; // Reduced for faster processing
  
  // Simple in-memory cache for search results
  private static searchCache = new Map<string, { results: SemanticSearchResult[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 30000; // 30 seconds cache
  
  static async searchNotes(
    notes: any[], 
    query: string
  ): Promise<SemanticSearchResult[]> {
    if (!query.trim()) return [];
    
    // Check cache first for instant results
    const cacheKey = query.toLowerCase().trim();
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('⚡ CACHE HIT: Instant search results');
      return cached.results;
    }
    
    console.log(`🧠 SEMANTIC SEARCH: "${query}" using optimized similarity`);
    const searchStart = performance.now();
    
    try {
      // Try semantic search with timeout for fast fallback
      const semanticPromise = PineconeService.semanticSearch(query, 12);
      const timeoutPromise = new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error('Semantic search timeout')), 2000) // 2 second timeout
      );
      
      let vectorResults: any[] = [];
      try {
        vectorResults = await Promise.race([semanticPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.log('⚠️ Semantic search timeout, using fast fallback');
        vectorResults = [];
      }
      
      let results: SemanticSearchResult[];
      
      if (vectorResults.length === 0) {
        console.log('⚠️ No semantic matches, using optimized keyword search');
        results = this.optimizedKeywordSearch(notes, query);
      } else {
        // Process semantic results
        results = vectorResults
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
              source_url: result.metadata?.noteId,
              created_at: result.metadata?.createdAt,
              is_transcription: result.sourceType === 'video',
              similarity: result.similarity
            }
          }));
      }
      
      const searchTime = performance.now() - searchStart;
      
      // Cache successful results
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });
      
      // Clean old cache entries
      if (this.searchCache.size > 20) {
        const oldestKey = this.searchCache.keys().next().value;
        this.searchCache.delete(oldestKey);
      }
      
      console.log(`⚡ OPTIMIZED SEARCH COMPLETE: ${searchTime.toFixed(1)}ms, ${results.length} results`);
      
      return results;
    } catch (error) {
      console.error('❌ Semantic search error:', error);
      console.log('🔄 Falling back to optimized keyword search');
      return this.optimizedKeywordSearch(notes, query);
    }
  }
  
  private static optimizedKeywordSearch(notes: any[], query: string): SemanticSearchResult[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    // Pre-filter notes for better performance
    const relevantNotes = notes.filter(note => {
      const titleLower = (note.title || '').toLowerCase();
      const contentLower = (note.content || '').toLowerCase();
      
      // Quick relevance check
      return queryWords.some(word => 
        titleLower.includes(word) || contentLower.includes(word)
      );
    });
    
    return relevantNotes
      .map(note => {
        const titleLower = (note.title || '').toLowerCase();
        const contentLower = (note.content || '').toLowerCase();
        
        let relevance = 0;
        
        // Optimized scoring
        if (titleLower.includes(queryLower)) relevance += 0.9;
        
        for (const word of queryWords) {
          if (titleLower.includes(word)) relevance += 0.4;
          if (contentLower.includes(word)) relevance += 0.15;
        }
        
        if (relevance < 0.2) return null;
        
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
      const start = Math.max(0, queryIndex - 40);
      const end = Math.min(content.length, queryIndex + query.length + 40);
      return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
    }
    
    return content.substring(0, 120) + (content.length > 120 ? '...' : '');
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
