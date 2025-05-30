
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
  };
}

interface QueryAnalysis {
  entities: string[];
  intent: 'specific_person' | 'topic' | 'general';
  contentType: 'video' | 'text' | 'any';
  specificity: number;
}

export class EnhancedSearchEngine {
  private static readonly RELEVANCE_THRESHOLD = 0.6;
  private static readonly ENTITY_BOOST = 2.0;
  private static readonly TITLE_BOOST = 1.5;
  
  static searchNotes(notes: any[], query: string): SearchResult[] {
    if (!query.trim() || !notes.length) return [];
    
    const queryAnalysis = this.analyzeQuery(query);
    console.log(`🔍 Search Analysis:`, queryAnalysis);
    
    const scoredResults = notes
      .map(note => this.scoreNote(note, query, queryAnalysis))
      .filter(result => result.relevance >= this.RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
    
    console.log(`✅ Found ${scoredResults.length} relevant results for "${query}"`);
    return scoredResults;
  }
  
  private static analyzeQuery(query: string): QueryAnalysis {
    const queryLower = query.toLowerCase();
    
    // Known entities (people, channels, etc.)
    const knownEntities = [
      'asmongold', 'seth godin', 'jordan peterson', 'joe rogan', 'elon musk'
    ];
    
    const entities = knownEntities.filter(entity => 
      queryLower.includes(entity)
    );
    
    // Determine intent
    let intent: QueryAnalysis['intent'] = 'general';
    if (entities.length > 0) {
      intent = 'specific_person';
    } else if (queryLower.length > 20) {
      intent = 'topic';
    }
    
    // Content type preference
    const videoKeywords = ['video', 'watch', 'stream', 'clip'];
    const textKeywords = ['note', 'article', 'text'];
    
    let contentType: QueryAnalysis['contentType'] = 'any';
    if (videoKeywords.some(kw => queryLower.includes(kw))) {
      contentType = 'video';
    } else if (textKeywords.some(kw => queryLower.includes(kw))) {
      contentType = 'text';
    }
    
    return {
      entities,
      intent,
      contentType,
      specificity: entities.length > 0 ? 1.0 : Math.min(queryLower.length / 50, 1.0)
    };
  }
  
  private static scoreNote(note: any, query: string, analysis: QueryAnalysis): SearchResult {
    const queryLower = query.toLowerCase();
    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.content || '').toLowerCase();
    const channelLower = (note.channel_name || '').toLowerCase();
    
    let relevance = 0;
    
    // Entity matching (highest priority for specific queries)
    if (analysis.intent === 'specific_person') {
      let entityMatch = false;
      for (const entity of analysis.entities) {
        if (titleLower.includes(entity) || channelLower.includes(entity)) {
          relevance += this.ENTITY_BOOST;
          entityMatch = true;
        }
      }
      
      // If no entity match for specific person query, heavily penalize
      if (!entityMatch) {
        relevance -= 1.0;
      }
    }
    
    // Title matching
    if (titleLower.includes(queryLower)) {
      relevance += this.TITLE_BOOST;
    }
    
    // Individual word matching
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of queryWords) {
      if (titleLower.includes(word)) relevance += 0.5;
      if (contentLower.includes(word)) relevance += 0.2;
      if (channelLower.includes(word)) relevance += 0.3;
    }
    
    // Content type matching
    const isVideo = note.is_transcription;
    if (analysis.contentType === 'video' && isVideo) {
      relevance += 0.3;
    } else if (analysis.contentType === 'text' && !isVideo) {
      relevance += 0.3;
    } else if (analysis.contentType !== 'any' && 
               ((analysis.contentType === 'video') !== isVideo)) {
      relevance -= 0.5;
    }
    
    // Filter out reaction videos for specific person queries
    if (analysis.intent === 'specific_person' && isVideo) {
      const reactionPatterns = /\b(reacts?|reaction|responds?|watching)\b/i;
      if (reactionPatterns.test(note.title) && !analysis.entities.some(entity => 
        channelLower.includes(entity.toLowerCase())
      )) {
        relevance -= 0.8; // Heavy penalty for unrelated reaction videos
      }
    }
    
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      relevance: Math.max(0, relevance),
      snippet: this.generateSnippet(note.content || note.title, query),
      sourceType: isVideo ? 'video' : 'note',
      metadata: {
        source_url: note.source_url,
        created_at: note.created_at,
        is_transcription: note.is_transcription,
        channel_name: note.channel_name,
        video_id: note.video_id
      }
    };
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
}
