
interface EmbeddingData {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    title: string;
    type: 'note' | 'transcript' | 'ocr';
    source_url?: string;
    created_at: string;
  };
}

interface VectorSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata: any;
}

export class VectorService {
  private static embeddingsCache = new Map<string, number[]>();
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly SIMILARITY_THRESHOLD = 0.7;
  private static readonly MAX_RESULTS = 5;

  static async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.embeddingsCache.has(cacheKey)) {
      console.log('🚀 Embedding cache hit');
      return this.embeddingsCache.get(cacheKey)!;
    }

    try {
      // Use OpenAI embeddings via edge function
      const response = await fetch('/api/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 8000) }) // Limit text length
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.embedding;

      // Cache the result
      this.embeddingsCache.set(cacheKey, embedding);
      setTimeout(() => this.embeddingsCache.delete(cacheKey), this.CACHE_TTL);

      return embedding;
    } catch (error) {
      console.error('🚨 Embedding generation failed:', error);
      throw error;
    }
  }

  static async vectorSearch(query: string, documents: any[]): Promise<VectorSearchResult[]> {
    if (!query.trim() || documents.length === 0) {
      return [];
    }

    console.log(`🔍 VECTOR SEARCH: Processing ${documents.length} documents for: "${query}"`);

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Generate embeddings for documents and calculate similarities
      const searchResults: VectorSearchResult[] = [];

      for (const doc of documents) {
        try {
          const content = this.prepareContentForEmbedding(doc);
          if (!content) continue;

          const docEmbedding = await this.generateEmbedding(content);
          const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);

          if (similarity >= this.SIMILARITY_THRESHOLD) {
            searchResults.push({
              id: doc.id,
              title: doc.title,
              content: doc.content || '',
              similarity,
              metadata: {
                type: doc.is_transcription ? 'transcript' : 'note',
                source_url: doc.source_url,
                created_at: doc.created_at,
                is_transcription: doc.is_transcription
              }
            });
          }
        } catch (error) {
          console.warn(`⚠️ Skipping document ${doc.id} due to embedding error:`, error);
        }
      }

      // Sort by similarity and limit results
      const sortedResults = searchResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.MAX_RESULTS);

      console.log(`✅ VECTOR SEARCH COMPLETE: ${sortedResults.length} semantic matches found`);
      sortedResults.forEach(r => 
        console.log(`   - "${r.title}" (${r.metadata.type}): ${(r.similarity * 100).toFixed(1)}% match`)
      );

      return sortedResults;
    } catch (error) {
      console.error('🚨 Vector search failed:', error);
      return [];
    }
  }

  private static prepareContentForEmbedding(doc: any): string {
    const title = doc.title || '';
    const content = doc.content || '';
    
    // Combine title and content, prioritizing title
    const combined = `${title}\n\n${content}`;
    
    // Limit content length for embedding API
    return combined.substring(0, 6000);
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private static hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static clearCache(): void {
    this.embeddingsCache.clear();
    console.log('🧹 Vector service cache cleared');
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.embeddingsCache.size,
      keys: Array.from(this.embeddingsCache.keys())
    };
  }
}
