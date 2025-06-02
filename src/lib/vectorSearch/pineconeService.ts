
interface PineconeVector {
  id: string;
  values: number[];
  metadata: {
    noteId: string;
    title: string;
    content: string;
    sourceType: 'video' | 'note';
    createdAt: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

interface PineconeQueryResponse {
  matches: Array<{
    id: string;
    score: number;
    metadata: PineconeVector['metadata'];
  }>;
}

export class PineconeService {
  private static readonly EMBEDDING_DIMENSION = 1536; // OpenAI text-embedding-3-small dimension
  private static readonly TOP_K = 10;
  
  static async upsertNoteVectors(
    noteId: string,
    title: string,
    content: string,
    sourceType: 'video' | 'note'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const chunks = this.chunkContent(content, 1000);
      const vectors: PineconeVector[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = `${title}\n\n${chunks[i]}`;
        const embedding = await this.generateEmbedding(chunkText);
        
        if (embedding) {
          vectors.push({
            id: `${noteId}_chunk_${i}`,
            values: embedding,
            metadata: {
              noteId,
              title,
              content: chunks[i],
              sourceType,
              createdAt: new Date().toISOString(),
              chunkIndex: i,
              totalChunks: chunks.length
            }
          });
        }
      }
      
      const { data, error } = await supabase.functions.invoke('pinecone-operations', {
        body: {
          operation: 'upsert',
          vectors
        }
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error upserting note vectors:', error);
      return { success: false, error: error.message };
    }
  }
  
  static async semanticSearch(
    query: string,
    topK: number = this.TOP_K
  ): Promise<Array<{
    noteId: string;
    title: string;
    content: string;
    sourceType: 'video' | 'note';
    similarity: number;
    metadata: PineconeVector['metadata'];
  }>> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }
      
      const { data, error } = await supabase.functions.invoke('pinecone-operations', {
        body: {
          operation: 'query',
          vector: queryEmbedding,
          topK,
          includeMetadata: true
        }
      });
      
      if (error) throw error;
      
      return data.matches.map(match => ({
        noteId: match.metadata.noteId,
        title: match.metadata.title,
        content: match.metadata.content,
        sourceType: match.metadata.sourceType,
        similarity: match.score,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }
  
  static async deleteNoteVectors(noteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('pinecone-operations', {
        body: {
          operation: 'delete',
          noteId
        }
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting note vectors:', error);
      return { success: false, error: error.message };
    }
  }
  
  private static async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('pinecone-operations', {
        body: {
          operation: 'generate-embedding',
          text
        }
      });
      
      if (error) throw error;
      
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }
  
  private static chunkContent(content: string, maxChunkSize: number): string[] {
    if (!content || content.length <= maxChunkSize) {
      return [content || ''];
    }
    
    const chunks: string[] = [];
    const paragraphs = content.split('\n\n');
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = paragraph;
        } else {
          // Handle very long paragraphs
          const sentences = paragraph.split('. ');
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxChunkSize) {
              currentChunk += (currentChunk ? '. ' : '') + sentence;
            } else {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = sentence;
            }
          }
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.length > 0 ? chunks : [content];
  }
}

// Import supabase client
import { supabase } from "@/integrations/supabase/client";
