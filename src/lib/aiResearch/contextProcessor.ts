
export interface SourceData {
  id: string;
  title: string;
  content: string;
  relevance: number;
  metadata?: {
    source_url?: string;
    is_transcription?: boolean;
    created_at?: string;
  };
}

export interface ProcessedContext {
  relevantChunks: string[];
  sources: SourceData[];
  totalTokens: number;
  contextSummary: string;
}

export class ContextProcessor {
  private static readonly MAX_CONTEXT_LENGTH = 8000; // Reduced for better focus
  private static readonly MIN_RELEVANCE_THRESHOLD = 0.3; // Higher threshold for accuracy
  private static readonly CHUNK_SIZE = 800; // Smaller chunks for precision

  static processNotesForContext(notes: any[], query: string): ProcessedContext {
    if (!notes || notes.length === 0) {
      return {
        relevantChunks: [],
        sources: [],
        totalTokens: 0,
        contextSummary: "No relevant notes found."
      };
    }

    console.log(`🔍 Processing ${notes.length} notes for query: "${query}"`);

    // Enhanced relevance scoring with stricter criteria
    const scoredNotes = notes
      .map(note => {
        const relevanceScore = this.calculateEnhancedRelevance(note, query);
        return {
          ...note,
          relevanceScore,
          normalizedTitle: note.title.toLowerCase(),
          normalizedContent: (note.content || '').toLowerCase()
        };
      })
      .filter(note => note.relevanceScore >= this.MIN_RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`🎯 Found ${scoredNotes.length} relevant notes above threshold`);

    if (scoredNotes.length === 0) {
      return {
        relevantChunks: [],
        sources: [],
        totalTokens: 0,
        contextSummary: `No notes found relevant to query: "${query}"`
      };
    }

    // Process top relevant notes with strict source attribution
    const processedSources: SourceData[] = [];
    const contextChunks: string[] = [];
    let totalTokens = 0;

    for (const note of scoredNotes.slice(0, 5)) { // Limit to top 5 for accuracy
      if (totalTokens >= this.MAX_CONTEXT_LENGTH) break;

      const sourceData: SourceData = {
        id: note.id,
        title: note.title,
        content: note.content || '',
        relevance: note.relevanceScore,
        metadata: {
          source_url: note.source_url,
          is_transcription: note.is_transcription,
          created_at: note.created_at
        }
      };

      // Create clearly attributed content chunks
      const chunks = this.createAttributedChunks(note, query);
      for (const chunk of chunks) {
        if (totalTokens + chunk.length <= this.MAX_CONTEXT_LENGTH) {
          contextChunks.push(chunk);
          totalTokens += chunk.length;
        } else {
          break;
        }
      }

      processedSources.push(sourceData);
      console.log(`📄 Processed note: "${note.title}" (relevance: ${note.relevanceScore.toFixed(2)})`);
    }

    // Create context summary with clear source attribution
    const contextSummary = this.createContextSummary(processedSources, query);

    return {
      relevantChunks: contextChunks,
      sources: processedSources,
      totalTokens,
      contextSummary
    };
  }

  private static calculateEnhancedRelevance(note: any, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.content || '').toLowerCase();

    // Extract key terms from query (remove common words)
    const queryTerms = queryLower
      .split(/\s+/)
      .filter(term => term.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(term));

    if (queryTerms.length === 0) return 0;

    let relevanceScore = 0;
    const maxScore = queryTerms.length * 3; // Maximum possible score

    // Title matching (highest weight)
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        relevanceScore += 3; // High weight for title matches
      }
    }

    // Content matching (medium weight)
    for (const term of queryTerms) {
      const termCount = (contentLower.match(new RegExp(term, 'g')) || []).length;
      relevanceScore += Math.min(termCount * 0.5, 2); // Cap content contribution
    }

    // Exact phrase matching (bonus)
    if (titleLower.includes(queryLower) || contentLower.includes(queryLower)) {
      relevanceScore += 2;
    }

    // Normalize to 0-1 range
    return Math.min(relevanceScore / maxScore, 1);
  }

  private static createAttributedChunks(note: any, query: string): string[] {
    const chunks: string[] = [];
    const content = note.content || '';
    
    // Create header with clear source attribution
    const sourceHeader = `**SOURCE: ${note.title}**\n` +
      `ID: ${note.id}\n` +
      `Type: ${note.is_transcription ? 'Video Transcript' : 'Note'}\n` +
      `URL: ${note.source_url || 'N/A'}\n` +
      `Created: ${note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown'}\n` +
      `---\n`;

    if (content.length <= this.CHUNK_SIZE) {
      chunks.push(sourceHeader + content);
    } else {
      // Split content into smaller chunks with source attribution
      const contentChunks = this.splitIntoChunks(content, this.CHUNK_SIZE - sourceHeader.length);
      contentChunks.forEach((chunk, index) => {
        const chunkHeader = index === 0 ? sourceHeader : `**CONTINUED FROM: ${note.title} (Part ${index + 1})**\n---\n`;
        chunks.push(chunkHeader + chunk);
      });
    }

    return chunks;
  }

  private static splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkSize) {
        currentChunk += sentence + '. ';
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence + '. ';
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  private static createContextSummary(sources: SourceData[], query: string): string {
    const sourcesList = sources
      .map(source => `- "${source.title}" (Relevance: ${source.relevance.toFixed(2)}, ID: ${source.id})`)
      .join('\n');

    return `Query: "${query}"\nRelevant Sources Found: ${sources.length}\n${sourcesList}`;
  }

  static clearCache(): void {
    console.log('🧹 Context processor cache cleared');
  }
}
