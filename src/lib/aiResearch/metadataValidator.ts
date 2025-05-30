interface VideoMetadata {
  title?: string;
  channel_name?: string;
  description?: string;
  source_url?: string;
  tags?: string[];
}

interface ContentMetadata {
  source_url?: string;
  is_transcription?: boolean;
  created_at?: string;
  video_id?: string;
  channel_name?: string;
}

export class MetadataValidator {
  private static readonly STRICT_MATCH_THRESHOLD = 0.8;
  private static readonly MIN_ENTITY_OVERLAP = 0.6;
  
  /**
   * Validates if content metadata matches query intent
   */
  static validateContentRelevance(
    content: { title: string; metadata?: ContentMetadata },
    query: string,
    strictMode: boolean = true
  ): { isValid: boolean; confidence: number; reason: string } {
    const queryLower = query.toLowerCase().trim();
    const titleLower = content.title.toLowerCase();
    
    // Extract key entities from query
    const queryEntities = this.extractQueryEntities(queryLower);
    const contentEntities = this.extractContentEntities(titleLower, content.metadata);
    
    // Strict entity matching
    const entityMatch = this.calculateEntityMatch(queryEntities, contentEntities);
    
    if (strictMode && entityMatch.overlap < this.MIN_ENTITY_OVERLAP) {
      return {
        isValid: false,
        confidence: entityMatch.overlap,
        reason: `Low entity overlap: ${entityMatch.overlap.toFixed(3)} < ${this.MIN_ENTITY_OVERLAP}`
      };
    }
    
    // Channel/creator validation for video content
    let channelValidation = { isValid: true, confidence: 1.0, reason: 'No channel validation needed' };
    if (content.metadata?.is_transcription && content.metadata?.channel_name) {
      channelValidation = this.validateChannelRelevance(queryEntities, content.metadata.channel_name);
      if (!channelValidation.isValid && strictMode) {
        return {
          isValid: false,
          confidence: channelValidation.confidence,
          reason: `Channel mismatch: ${channelValidation.reason}`
        };
      }
    }
    
    // Content type validation
    const contentTypeMatch = this.validateContentType(queryLower, content);
    if (!contentTypeMatch.isValid && strictMode) {
      return {
        isValid: false,
        confidence: contentTypeMatch.confidence,
        reason: `Content type mismatch: ${contentTypeMatch.reason}`
      };
    }
    
    // Calculate final confidence score
    const finalConfidence = Math.min(
      entityMatch.overlap,
      channelValidation.confidence,
      contentTypeMatch.confidence
    );
    
    return {
      isValid: finalConfidence >= this.STRICT_MATCH_THRESHOLD,
      confidence: finalConfidence,
      reason: finalConfidence >= this.STRICT_MATCH_THRESHOLD ? 'Valid match' : 'Below confidence threshold'
    };
  }
  
  private static extractQueryEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Known creators/personalities (case-insensitive)
    const creators = ['asmongold', 'seth godin', 'jordan peterson', 'joe rogan', 'elon musk'];
    const foundCreators = creators.filter(creator => 
      query.includes(creator.toLowerCase())
    );
    entities.push(...foundCreators);
    
    // Proper nouns (capitalized words in original query)
    const properNouns = query.match(/\b[A-Z][a-z]+\b/g) || [];
    entities.push(...properNouns.map(noun => noun.toLowerCase()));
    
    // Significant terms (longer than 4 characters, not common words)
    const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'your']);
    
    const significantTerms = query
      .split(/\s+/)
      .filter(term => term.length > 4 && !stopWords.has(term.toLowerCase()))
      .map(term => term.toLowerCase());
    
    entities.push(...significantTerms);
    
    return [...new Set(entities)];
  }
  
  private static extractContentEntities(title: string, metadata?: ContentMetadata): string[] {
    const entities: string[] = [];
    
    // Channel name is a strong entity indicator
    if (metadata?.channel_name) {
      entities.push(metadata.channel_name.toLowerCase());
    }
    
    // Extract from title
    const titleWords = title.split(/\s+/).filter(word => word.length > 3);
    entities.push(...titleWords.map(word => word.toLowerCase()));
    
    // Look for creator mentions in title
    const creatorPatterns = [
      /asmongold/i,
      /seth.?godin/i,
      /jordan.?peterson/i,
      /joe.?rogan/i,
      /elon.?musk/i
    ];
    
    for (const pattern of creatorPatterns) {
      const match = title.match(pattern);
      if (match) {
        entities.push(match[0].toLowerCase());
      }
    }
    
    return [...new Set(entities)];
  }
  
  private static calculateEntityMatch(queryEntities: string[], contentEntities: string[]): {
    overlap: number;
    matchedEntities: string[];
  } {
    if (queryEntities.length === 0) {
      return { overlap: 0, matchedEntities: [] };
    }
    
    const matchedEntities: string[] = [];
    
    for (const queryEntity of queryEntities) {
      const hasMatch = contentEntities.some(contentEntity => {
        // Exact match
        if (contentEntity === queryEntity) return true;
        
        // Substring match for longer entities
        if (queryEntity.length > 5 && contentEntity.includes(queryEntity)) return true;
        if (contentEntity.length > 5 && queryEntity.includes(contentEntity)) return true;
        
        return false;
      });
      
      if (hasMatch) {
        matchedEntities.push(queryEntity);
      }
    }
    
    return {
      overlap: matchedEntities.length / queryEntities.length,
      matchedEntities
    };
  }
  
  private static validateChannelRelevance(queryEntities: string[], channelName: string): {
    isValid: boolean;
    confidence: number;
    reason: string;
  } {
    const channelLower = channelName.toLowerCase();
    
    // Check if any query entity matches the channel
    for (const entity of queryEntities) {
      if (channelLower.includes(entity) || entity.includes(channelLower)) {
        return {
          isValid: true,
          confidence: 1.0,
          reason: `Channel match found: ${entity} <-> ${channelName}`
        };
      }
    }
    
    // If query mentions specific creator but channel doesn't match, it's likely wrong content
    const creatorMentions = queryEntities.filter(entity => 
      ['asmongold', 'seth godin', 'jordan peterson', 'joe rogan', 'elon musk'].includes(entity)
    );
    
    if (creatorMentions.length > 0) {
      return {
        isValid: false,
        confidence: 0.1,
        reason: `Query mentions specific creator (${creatorMentions.join(', ')}) but channel is ${channelName}`
      };
    }
    
    return {
      isValid: true,
      confidence: 0.7,
      reason: 'No specific creator conflict detected'
    };
  }
  
  private static validateContentType(query: string, content: { metadata?: ContentMetadata }): {
    isValid: boolean;
    confidence: number;
    reason: string;
  } {
    // Check for content type hints in query
    const videoKeywords = ['video', 'watch', 'stream', 'episode', 'clip', 'reaction'];
    const noteKeywords = ['note', 'article', 'text', 'document', 'write'];
    
    const hasVideoHint = videoKeywords.some(keyword => query.includes(keyword));
    const hasNoteHint = noteKeywords.some(keyword => query.includes(keyword));
    
    const isVideoContent = content.metadata?.is_transcription === true;
    
    // If query specifically asks for video but content is not video (or vice versa)
    if (hasVideoHint && !isVideoContent) {
      return {
        isValid: false,
        confidence: 0.3,
        reason: 'Query requests video content but source is text note'
      };
    }
    
    if (hasNoteHint && isVideoContent) {
      return {
        isValid: false,
        confidence: 0.3,
        reason: 'Query requests text content but source is video transcript'
      };
    }
    
    return {
      isValid: true,
      confidence: 1.0,
      reason: 'Content type matches query intent'
    };
  }
  
  /**
   * Advanced validation for video content specifically
   */
  static validateVideoContent(
    title: string,
    metadata: ContentMetadata,
    query: string
  ): { isValid: boolean; confidence: number; issues: string[] } {
    const issues: string[] = [];
    let confidence = 1.0;
    
    // Check for reaction video patterns that might be irrelevant
    const reactionPatterns = [
      /reacts?\s+to/i,
      /reaction/i,
      /responds?\s+to/i,
      /watching/i
    ];
    
    const isReactionVideo = reactionPatterns.some(pattern => title.match(pattern));
    
    if (isReactionVideo) {
      // Reaction videos are only relevant if the reactor is mentioned in the query
      const queryMentionsReactor = metadata.channel_name && 
        query.toLowerCase().includes(metadata.channel_name.toLowerCase());
      
      if (!queryMentionsReactor) {
        issues.push('Reaction video where reactor not mentioned in query');
        confidence *= 0.3;
      }
    }
    
    // Check for compilation/highlights that might be too general
    const compilationPatterns = [
      /compilation/i,
      /highlights/i,
      /best\s+of/i,
      /moments/i,
      /clips/i
    ];
    
    const isCompilation = compilationPatterns.some(pattern => title.match(pattern));
    
    if (isCompilation && !query.toLowerCase().includes('compilation') && !query.toLowerCase().includes('highlights')) {
      issues.push('Compilation video not specifically requested');
      confidence *= 0.5;
    }
    
    return {
      isValid: confidence > 0.5 && issues.length < 2,
      confidence,
      issues
    };
  }
}
