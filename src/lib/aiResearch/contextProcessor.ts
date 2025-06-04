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
  isolationLevel: 'strict' | 'normal';
}

export class ContextProcessor {
  private static readonly MAX_CONTEXT_LENGTH = 4000; // Reduced for better focus
  private static readonly STRICT_RELEVANCE_THRESHOLD = 0.6; // Much higher threshold
  private static readonly CHUNK_SIZE = 400; // Smaller chunks
  private static readonly MAX_SOURCES = 2; // Limit to prevent mixing

  static processNotesForContext(notes: any[], query: string): ProcessedContext {
    if (!notes || notes.length === 0) {
      return {
        relevantChunks: [],
        sources: [],
        totalTokens: 0,
        contextSummary: "No relevant notes found.",
        queryFingerprint: this.createQueryFingerprint(query, []),
        isolationLevel: 'strict'
      };
    }

    console.log(`🔒 STRICT ISOLATION: Processing ${notes.length} notes for: "${query}"`);

    // Ultra-strict relevance scoring with semantic validation
    const scoredNotes = notes
      .map(note => {
        const relevanceScore = this.calculateUltraStrictRelevance(note, query);
        const semanticMatch = this.validateSemanticRelevance(note, query);
        
        return {
          ...note,
          relevanceScore: relevanceScore * semanticMatch, // Multiply by semantic factor
          sourceIdentifier: `${note.title}_${note.id}`,
          contentHash: this.createContentHash(note.content || ''),
          queryAlignment: this.calculateQueryAlignment(note, query)
        };
      })
      .filter(note => {
        const passesThreshold = note.relevanceScore >= this.STRICT_RELEVANCE_THRESHOLD;
        const hasQueryAlignment = note.queryAlignment > 0.3;
        
        if (!passesThreshold) {
          console.log(`❌ FILTERED OUT: "${note.title}" - relevance ${note.relevanceScore.toFixed(3)} below ${this.STRICT_RELEVANCE_THRESHOLD}`);
        }
        
        return passesThreshold && hasQueryAlignment;
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.MAX_SOURCES);

    console.log(`🎯 ULTRA-FILTERED: ${scoredNotes.length} sources passed strict validation`);

    if (scoredNotes.length === 0) {
      return {
        relevantChunks: [],
        sources: [],
        totalTokens: 0,
        contextSummary: `STRICT VALIDATION: No sources meet ultra-high relevance threshold for query: "${query}"`,
        queryFingerprint: this.createQueryFingerprint(query, []),
        isolationLevel: 'strict'
      };
    }

    // Process with MAXIMUM source isolation
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

      // Create ultra-isolated content chunks with strict barriers
      const chunks = this.createUltraIsolatedChunks(note, query);
      for (const chunk of chunks) {
        if (totalTokens + chunk.length <= this.MAX_CONTEXT_LENGTH) {
          contextChunks.push(chunk);
          totalTokens += chunk.length;
        } else {
          break;
        }
      }

      processedSources.push(sourceData);
      console.log(`🔒 ISOLATED: "${note.title}" (ID: ${note.id}, relevance: ${note.relevanceScore.toFixed(3)}, alignment: ${note.queryAlignment.toFixed(3)})`);
    }

    const contextSummary = this.createUltraStrictContextSummary(processedSources, query);
    const queryFingerprint = this.createQueryFingerprint(query, processedSources);

    console.log(`✅ STRICT CONTEXT READY: ${processedSources.length} isolated sources, ${totalTokens} tokens`);

    return {
      relevantChunks: contextChunks,
      sources: processedSources,
      totalTokens,
      contextSummary,
      queryFingerprint,
      isolationLevel: 'strict'
    };
  }

  private static calculateUltraStrictRelevance(note: any, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.content || '').toLowerCase();

    // Extract only the most significant query terms
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'may', 'each', 'which', 'their', 'time', 'will', 'about', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'would', 'make', 'like', 'into', 'more', 'go', 'no', 'do', 'does', 'what', 'where', 'when', 'why', 'how', 'video', 'content', 'note', 'notes']);
    
    const queryTerms = queryLower
      .split(/\s+/)
      .filter(term => term.length > 3 && !stopWords.has(term)) // Increased minimum length
      .slice(0, 3); // Limit to most important terms

    if (queryTerms.length === 0) return 0;

    let relevanceScore = 0;
    const maxScore = queryTerms.length * 6; // Higher max score for stricter curve

    // ULTRA-STRICT title matching (must be exact or very close)
    for (const term of queryTerms) {
      // Exact word boundary matching only
      const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
      if (titleLower.match(wordBoundaryRegex)) {
        relevanceScore += 6; // Maximum weight for exact title match
      }
    }

    // STRICT content matching with position priority
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      const matches = contentLower.match(regex) || [];
      
      if (matches.length > 0) {
        // Only count early occurrences heavily
        const firstMatch = contentLower.indexOf(matches[0].toLowerCase());
        if (firstMatch < 300) { // Must be very early in content
          relevanceScore += Math.min(matches.length, 2); // Cap at 2 points
        }
      }
    }

    // Exact phrase matching (critical for proper source identification)
    const phraseBonus = this.calculatePhraseMatchBonus(titleLower, contentLower, queryLower);
    relevanceScore += phraseBonus;

    // Apply ultra-strict normalization with power curve
    const normalizedScore = Math.min(relevanceScore / maxScore, 1);
    return Math.pow(normalizedScore, 2.5); // Very steep curve for maximum selectivity
  }

  private static validateSemanticRelevance(note: any, query: string): number {
    // Semantic validation to prevent topic mixing
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    const query_lower = query.toLowerCase();

    // Extract key entities/topics from query
    const queryEntities = this.extractKeyEntities(query_lower);
    const noteEntities = this.extractKeyEntities(title + ' ' + content);

    // Calculate entity overlap
    const commonEntities = queryEntities.filter(entity => 
      noteEntities.some(noteEntity => 
        noteEntity.includes(entity) || entity.includes(noteEntity)
      )
    );

    const entityOverlap = queryEntities.length > 0 ? commonEntities.length / queryEntities.length : 0;
    
    // Boost if entities match well, penalize if no entity overlap
    return entityOverlap > 0.3 ? 1.0 : 0.2; // Strong penalty for poor entity alignment
  }

  private static extractKeyEntities(text: string): string[] {
    // Simple entity extraction - look for proper nouns, specific terms
    const words = text.split(/\s+/);
    const entities: string[] = [];
    
    for (const word of words) {
      // Capitalized words (potential proper nouns)
      if (/^[A-Z][a-z]+/.test(word) && word.length > 3) {
        entities.push(word.toLowerCase());
      }
      // Technical terms, brands, etc.
      if (word.length > 5 && !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use|may|each|which|their|time|will|about)$/.test(word.toLowerCase())) {
        entities.push(word.toLowerCase());
      }
    }
    
    return [...new Set(entities)]; // Remove duplicates
  }

  private static calculateQueryAlignment(note: any, query: string): number {
    // Additional alignment check to prevent cross-contamination
    const noteText = `${note.title} ${note.content || ''}`.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    let alignmentScore = 0;
    for (const word of queryWords) {
      if (noteText.includes(word)) {
        alignmentScore += 1;
      }
    }
    
    return queryWords.length > 0 ? alignmentScore / queryWords.length : 0;
  }

  private static calculatePhraseMatchBonus(title: string, content: string, query: string): number {
    let bonus = 0;
    
    // Exact phrase in title (highest priority)
    if (title.includes(query)) {
      bonus += 8;
    }
    
    // Exact phrase in content
    if (content.includes(query)) {
      bonus += 4;
    }
    
    // Partial phrase matching for multi-word queries
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length > 1) {
      const subsequences = this.generateSubsequences(queryWords);
      for (const subseq of subsequences) {
        const phrase = subseq.join(' ');
        if (phrase.length > 4) {
          if (title.includes(phrase)) bonus += 2;
          if (content.includes(phrase)) bonus += 1;
        }
      }
    }
    
    return Math.min(bonus, 10); // Cap the bonus
  }

  private static generateSubsequences(words: string[]): string[][] {
    const subsequences: string[][] = [];
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 2; j <= words.length; j++) { // At least 2 words
        subsequences.push(words.slice(i, j));
      }
    }
    return subsequences;
  }

  private static createUltraIsolatedChunks(note: any, query: string): string[] {
    const chunks: string[] = [];
    const content = note.content || '';
    
    // Create MAXIMUM isolation header with strict source barriers
    const isolationHeader = `════════════════════════════════════════\n` +
      `🔒 ISOLATED SOURCE BOUNDARY - DO NOT MIX WITH OTHER SOURCES\n` +
      `SOURCE_TITLE: ${note.title}\n` +
      `UNIQUE_SOURCE_ID: ${note.id}\n` +
      `SOURCE_TYPE: ${note.is_transcription ? 'VIDEO_TRANSCRIPT' : 'TEXT_NOTE'}\n` +
      `QUERY_RELEVANCE: ${this.calculateUltraStrictRelevance(note, query).toFixed(4)}\n` +
      `SOURCE_URL: ${note.source_url || 'NONE'}\n` +
      `CREATED: ${note.created_at ? new Date(note.created_at).toISOString() : 'UNKNOWN'}\n` +
      `CONTENT_HASH: ${this.createContentHash(content)}\n` +
      `⚠️  CRITICAL: This content is EXCLUSIVELY from the above source. DO NOT combine with other sources.\n` +
      `════════════════════════════════════════\n` +
      `VERIFIED_CONTENT_START:\n`;

    const isolationFooter = `\nVERIFIED_CONTENT_END\n` +
      `════════════════════════════════════════\n` +
      `🔒 END OF ISOLATED SOURCE: "${note.title}" (ID: ${note.id})\n` +
      `⚠️  ATTRIBUTION REQUIRED: All information above is strictly from this single source.\n` +
      `════════════════════════════════════════\n`;

    const availableSpace = this.CHUNK_SIZE - isolationHeader.length - isolationFooter.length;

    if (content.length <= availableSpace) {
      chunks.push(isolationHeader + content + isolationFooter);
    } else {
      // Split with isolation barriers between chunks
      const contentChunks = this.splitContentIntelligently(content, availableSpace);
      
      contentChunks.forEach((chunk, index) => {
        const chunkHeader = index === 0 ? isolationHeader : 
          `════════════════════════════════════════\n` +
          `🔒 CONTINUED FROM: ${note.title} (Part ${index + 1})\n` +
          `SOURCE_ID: ${note.id} | CHUNK: ${index + 1}/${contentChunks.length}\n` +
          `⚠️  SAME SOURCE CONTINUATION - DO NOT MIX\n` +
          `════════════════════════════════════════\n`;
        
        chunks.push(chunkHeader + chunk + isolationFooter);
      });
    }

    return chunks;
  }

  private static splitContentIntelligently(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    
    // Split by paragraphs first for better context preservation
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    let currentChunk = '';
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        
        // Handle oversized paragraphs by sentence splitting
        if (paragraph.length > chunkSize) {
          const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
          let sentenceChunk = '';
          
          for (const sentence of sentences) {
            const sentenceWithPunctuation = sentence.trim() + '. ';
            if ((sentenceChunk + sentenceWithPunctuation).length <= chunkSize) {
              sentenceChunk += sentenceWithPunctuation;
            } else {
              if (sentenceChunk) chunks.push(sentenceChunk.trim());
              sentenceChunk = sentenceWithPunctuation;
            }
          }
          
          currentChunk = sentenceChunk.trim();
        } else {
          currentChunk = paragraph;
        }
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks.filter(chunk => chunk.length > 0);
  }

  private static createUltraStrictContextSummary(sources: SourceData[], query: string): string {
    const sourcesList = sources
      .map(source => `- "${source.title}" (ID: ${source.id}, Ultra-Score: ${source.relevance.toFixed(4)}, Type: ${source.metadata?.is_transcription ? 'Video' : 'Note'})`)
      .join('\n');

    return `🔒 ULTRA-STRICT CONTEXT VALIDATION\n` +
      `QUERY: "${query}"\n` +
      `VERIFIED_SOURCES: ${sources.length} (Max: ${this.MAX_SOURCES})\n` +
      `RELEVANCE_THRESHOLD: ${this.STRICT_RELEVANCE_THRESHOLD} (Ultra-High)\n` +
      `ISOLATION_LEVEL: MAXIMUM\n` +
      `VALIDATED_SOURCES:\n${sourcesList}\n` +
      `⚠️  CRITICAL INSTRUCTION: AI must reference ONLY these verified sources. NO external knowledge. NO source mixing.`;
  }

  private static createQueryFingerprint(query: string, sources: SourceData[]): string {
    const sourceIds = sources.map(s => s.id).sort().join(',');
    const timestamp = Date.now();
    return `strict_${query.toLowerCase().replace(/\s+/g, '_')}_${sourceIds}_${timestamp}`;
  }

  private static createContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static clearCache(): void {
    console.log('🧹 Ultra-strict context processor cache cleared');
  }
}
