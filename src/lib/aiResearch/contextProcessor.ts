
export interface ProcessedContext {
  relevantChunks: string[];
  totalTokens: number;
  sources: Array<{
    id: string;
    title: string;
    relevance: number;
  }>;
}

export class ContextProcessor {
  private static readonly MAX_CONTEXT_LENGTH = 3000; // Reduced from full content
  private static readonly CHUNK_SIZE = 500;
  private static readonly MAX_CHUNKS = 4;

  static processNotesForContext(
    notes: any[],
    query: string
  ): ProcessedContext {
    if (!notes?.length) {
      return { relevantChunks: [], totalTokens: 0, sources: [] };
    }

    // Score and rank notes by relevance
    const scoredNotes = notes
      .map(note => ({
        ...note,
        relevanceScore: this.calculateRelevance(note, query)
      }))
      .filter(note => note.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 most relevant notes

    const chunks: string[] = [];
    const sources: Array<{ id: string; title: string; relevance: number }> = [];
    let totalTokens = 0;

    for (const note of scoredNotes) {
      if (chunks.length >= this.MAX_CHUNKS) break;

      const noteChunks = this.extractRelevantChunks(note, query);
      
      for (const chunk of noteChunks) {
        if (totalTokens + chunk.length > this.MAX_CONTEXT_LENGTH) break;
        
        chunks.push(`[${note.title}]\n${chunk}`);
        totalTokens += chunk.length;
        
        if (!sources.find(s => s.id === note.id)) {
          sources.push({
            id: note.id,
            title: note.title,
            relevance: note.relevanceScore
          });
        }
      }
    }

    return { relevantChunks: chunks, totalTokens, sources };
  }

  private static calculateRelevance(note: any, query: string): number {
    const queryLower = query.toLowerCase();
    const titleMatch = note.title.toLowerCase().includes(queryLower);
    const contentMatch = note.content?.toLowerCase().includes(queryLower) || false;
    
    let score = 0;
    if (titleMatch) score += 3;
    if (contentMatch) score += 1;
    
    // Boost recent notes
    const daysSinceCreated = (Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) score += 0.5;
    
    return score;
  }

  private static extractRelevantChunks(note: any, query: string): string[] {
    if (!note.content) return [];
    
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const sentences = note.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Find sentences containing query terms
    const relevantSentences = sentences.filter(sentence => 
      queryTerms.some(term => sentence.toLowerCase().includes(term))
    );
    
    if (relevantSentences.length === 0) {
      // If no direct matches, return first chunk
      return [note.content.substring(0, this.CHUNK_SIZE)];
    }
    
    // Group relevant sentences into chunks
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of relevantSentences.slice(0, 3)) {
      if (currentChunk.length + sentence.length > this.CHUNK_SIZE) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence + '. ';
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks.slice(0, 2); // Max 2 chunks per note
  }
}
