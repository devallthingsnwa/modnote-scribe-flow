
export interface SourceData {
  id: string;
  title: string;
  content: string;
  relevance: number;
  metadata?: {
    source_url?: string;
    is_transcription?: boolean;
    created_at?: string;
    video_id?: string;
    channel_name?: string;
  };
}

export interface ProcessedContext {
  relevantChunks: string[];
  sources: SourceData[];
  totalTokens: number;
  contextSummary: string;
  queryFingerprint: string;
}

export class ContextProcessor {
  private static readonly MAX_CONTEXT_LENGTH = 6000; // Reduced for better focus
  private static readonly MIN_RELEVANCE_THRESHOLD = 0.4; // Higher threshold for accuracy
  private static readonly CHUNK_SIZE = 600; // Smaller chunks for precision
  private static readonly MAX_SOURCES = 3; // Limit sources for clarity

  static processNotesForContext(notes: any[], query: string): ProcessedContext {
    if (!notes || notes.length === 0) {
      return {
        relevantChunks: [],
        sources: [],
        totalTokens: 0,
        contextSummary: "No relevant notes found.",
        queryFingerprint: this.createQueryFingerprint(query, [])
      };
    }

    console.log(`🔍 STRICT CONTEXT: Processing ${notes.length} notes for: "${query}"`);

    // Enhanced relevance scoring with stricter criteria
    const scoredNotes = notes
      .map(note => {
        const relevanceScore = this.calculateStrictRelevance(note, query);
        return {
          ...note,
          relevanceScore,
          sourceIdentifier: `${note.title}_${note.id}`,
          contentHash: this.createContentHash(note.content || '')
        };
      })
      .filter(note => note.relevanceScore >= this.MIN_RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.MAX_SOURCES); // Strict limit

    console.log(`🎯 FILTERED: ${scoredNotes.length} sources above threshold (${this.MIN_RELEVANCE_THRESHOLD})`);

    if (scoredNotes.length === 0) {
      return {
        relevantChunks: [],
        sources: [],
        totalTokens: 0,
        contextSummary: `No sources found relevant enough for query: "${query}"`,
        queryFingerprint: this.createQueryFingerprint(query, [])
      };
    }

    // Process with strict source attribution
    const processedSources: SourceData[] = [];
    const contextChunks: string[] = [];
    let totalTokens = 0;

    for (const note of scoredNotes) {
      if (totalTokens >= this.MAX_CONTEXT_LENGTH) break;

      const sourceData: SourceData = {
        id: note.id,
        title: note.title,
        content: note.content || '',
        relevance: note.relevanceScore,
        metadata: {
          source_url: note.source_url,
          is_transcription: note.is_transcription,
          created_at: note.created_at,
          video_id: note.video_id,
          channel_name: note.channel_name
        }
      };

      // Create clearly attributed content chunks with validation
      const chunks = this.createValidatedChunks(note, query);
      for (const chunk of chunks) {
        if (totalTokens + chunk.length <= this.MAX_CONTEXT_LENGTH) {
          contextChunks.push(chunk);
          totalTokens += chunk.length;
        } else {
          break;
        }
      }

      processedSources.push(sourceData);
      console.log(`📄 PROCESSED: "${note.title}" (ID: ${note.id}, relevance: ${note.relevanceScore.toFixed(3)})`);
    }

    // Create strict context summary
    const contextSummary = this.createStrictContextSummary(processedSources, query);
    const queryFingerprint = this.createQueryFingerprint(query, processedSources);

    console.log(`✅ CONTEXT READY: ${processedSources.length} sources, ${totalTokens} tokens`);

    return {
      relevantChunks: contextChunks,
      sources: processedSources,
      totalTokens,
      contextSummary,
      queryFingerprint
    };
  }

  private static calculateStrictRelevance(note: any, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.content || '').toLowerCase();

    // Extract meaningful terms (filter out common words more aggressively)
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'may', 'say', 'each', 'which', 'their', 'time', 'will', 'about', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'more', 'go', 'no', 'do', 'does', 'did', 'what', 'where', 'when', 'why', 'how']);
    
    const queryTerms = queryLower
      .split(/\s+/)
      .filter(term => term.length > 2 && !stopWords.has(term))
      .slice(0, 5); // Limit to most important terms

    if (queryTerms.length === 0) return 0;

    let relevanceScore = 0;
    const maxScore = queryTerms.length * 4; // Maximum possible score

    // Title matching (highest priority)
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        relevanceScore += 4; // Very high weight for title
      }
    }

    // Content term frequency with position weighting
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      const matches = contentLower.match(regex) || [];
      
      // Weight early mentions more heavily
      let termScore = 0;
      for (const match of matches) {
        const position = contentLower.indexOf(match);
        const positionWeight = position < 500 ? 1.5 : position < 2000 ? 1.0 : 0.5;
        termScore += positionWeight;
      }
      
      relevanceScore += Math.min(termScore, 3); // Cap per term
    }

    // Exact phrase matching (significant bonus)
    if (titleLower.includes(queryLower)) {
      relevanceScore += 5;
    } else if (contentLower.includes(queryLower)) {
      relevanceScore += 3;
    }

    // Normalize to 0-1 range with stricter curve
    const normalizedScore = Math.min(relevanceScore / maxScore, 1);
    return Math.pow(normalizedScore, 1.5); // Apply power curve for stricter filtering
  }

  private static createValidatedChunks(note: any, query: string): string[] {
    const chunks: string[] = [];
    const content = note.content || '';
    
    // Create enhanced header with strict source attribution
    const sourceHeader = `**VERIFIED SOURCE: ${note.title}**\n` +
      `UNIQUE_ID: ${note.id}\n` +
      `TYPE: ${note.is_transcription ? 'VIDEO_TRANSCRIPT' : 'TEXT_NOTE'}\n` +
      `SOURCE_URL: ${note.source_url || 'NONE'}\n` +
      `CREATED: ${note.created_at ? new Date(note.created_at).toISOString() : 'UNKNOWN'}\n` +
      `QUERY_RELEVANCE: ${this.calculateStrictRelevance(note, query).toFixed(3)}\n` +
      `CONTENT_VERIFICATION: This content is exclusively from the above source.\n` +
      `---CONTENT_START---\n`;

    const footer = `\n---CONTENT_END---\n` +
      `ATTRIBUTION: All above content is strictly from "${note.title}" (ID: ${note.id})\n`;

    if (content.length <= this.CHUNK_SIZE - sourceHeader.length - footer.length) {
      chunks.push(sourceHeader + content + footer);
    } else {
      // Split content with clear attribution
      const availableSpace = this.CHUNK_SIZE - sourceHeader.length - footer.length;
      const contentChunks = this.splitIntoMeaningfulChunks(content, availableSpace);
      
      contentChunks.forEach((chunk, index) => {
        const chunkHeader = index === 0 ? sourceHeader : 
          `**CONTINUED: ${note.title} (Part ${index + 1})**\n` +
          `SOURCE_ID: ${note.id}\n` +
          `---CONTENT_CONTINUATION---\n`;
        
        chunks.push(chunkHeader + chunk + footer);
      });
    }

    return chunks;
  }

  private static splitIntoMeaningfulChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    
    // Split by paragraphs first, then sentences
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    let currentChunk = '';
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        
        // Handle oversized paragraphs
        if (paragraph.length > chunkSize) {
          const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
          let sentenceChunk = '';
          
          for (const sentence of sentences) {
            if ((sentenceChunk + sentence).length <= chunkSize) {
              sentenceChunk += sentence + '. ';
            } else {
              if (sentenceChunk) chunks.push(sentenceChunk.trim());
              sentenceChunk = sentence + '. ';
            }
          }
          
          if (sentenceChunk) currentChunk = sentenceChunk.trim();
        } else {
          currentChunk = paragraph;
        }
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  private static createStrictContextSummary(sources: SourceData[], query: string): string {
    const sourcesList = sources
      .map(source => `- "${source.title}" (ID: ${source.id}, Score: ${source.relevance.toFixed(3)}, Type: ${source.metadata?.is_transcription ? 'Video' : 'Note'})`)
      .join('\n');

    return `QUERY: "${query}"\n` +
      `VERIFIED_SOURCES: ${sources.length}\n` +
      `RELEVANCE_THRESHOLD: ${this.MIN_RELEVANCE_THRESHOLD}\n` +
      `SOURCES:\n${sourcesList}\n` +
      `STRICT_ATTRIBUTION: AI must reference only these verified sources.`;
  }

  private static createQueryFingerprint(query: string, sources: SourceData[]): string {
    const sourceIds = sources.map(s => s.id).sort().join(',');
    return `${query.toLowerCase().replace(/\s+/g, '_')}_${sourceIds}_${Date.now()}`;
  }

  private static createContentHash(content: string): string {
    // Simple hash for content verification
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static clearCache(): void {
    console.log('🧹 Context processor cache cleared');
  }
}
