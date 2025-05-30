
export interface QueryIntent {
  primaryEntities: string[];
  contentType: 'video' | 'text' | 'any';
  specificity: 'high' | 'medium' | 'low';
  timeframe?: 'recent' | 'specific' | 'any';
  confidence: number;
}

export class QueryIntentAnalyzer {
  private static readonly ENTITY_PATTERNS = {
    creators: [
      { name: 'asmongold', aliases: ['asmon', 'zackrawrr'] },
      { name: 'seth godin', aliases: ['seth'] },
      { name: 'jordan peterson', aliases: ['peterson', 'jbp'] },
      { name: 'joe rogan', aliases: ['rogan', 'jre'] },
      { name: 'elon musk', aliases: ['musk', 'elon'] }
    ],
    topics: [
      'gaming', 'marketing', 'psychology', 'philosophy', 'technology',
      'business', 'self-help', 'productivity', 'leadership'
    ]
  };

  static analyzeQuery(query: string): QueryIntent {
    const queryLower = query.toLowerCase().trim();
    
    // Extract primary entities (people, brands, topics)
    const primaryEntities = this.extractPrimaryEntities(queryLower);
    
    // Determine content type preference
    const contentType = this.determineContentType(queryLower);
    
    // Calculate specificity based on entity count and query length
    const specificity = this.calculateSpecificity(queryLower, primaryEntities);
    
    // Check for time-based constraints
    const timeframe = this.extractTimeframe(queryLower);
    
    // Calculate overall confidence in intent understanding
    const confidence = this.calculateIntentConfidence(queryLower, primaryEntities, specificity);
    
    return {
      primaryEntities,
      contentType,
      specificity,
      timeframe,
      confidence
    };
  }
  
  private static extractPrimaryEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Check for known creators
    for (const creator of this.ENTITY_PATTERNS.creators) {
      if (query.includes(creator.name)) {
        entities.push(creator.name);
        continue;
      }
      
      for (const alias of creator.aliases) {
        if (query.includes(alias)) {
          entities.push(creator.name);
          break;
        }
      }
    }
    
    // Check for topic keywords
    for (const topic of this.ENTITY_PATTERNS.topics) {
      if (query.includes(topic)) {
        entities.push(topic);
      }
    }
    
    // Extract quoted phrases (high intent indicators)
    const quotedPhrases = query.match(/"([^"]+)"/g);
    if (quotedPhrases) {
      entities.push(...quotedPhrases.map(phrase => phrase.replace(/"/g, '')));
    }
    
    // Extract proper nouns from original query
    const properNouns = query.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
    entities.push(...properNouns.map(noun => noun.toLowerCase()));
    
    return [...new Set(entities)];
  }
  
  private static determineContentType(query: string): 'video' | 'text' | 'any' {
    const videoKeywords = ['video', 'watch', 'stream', 'episode', 'clip', 'reaction', 'youtube'];
    const textKeywords = ['note', 'article', 'text', 'document', 'write', 'blog'];
    
    const hasVideoKeywords = videoKeywords.some(keyword => query.includes(keyword));
    const hasTextKeywords = textKeywords.some(keyword => query.includes(keyword));
    
    if (hasVideoKeywords && !hasTextKeywords) return 'video';
    if (hasTextKeywords && !hasVideoKeywords) return 'text';
    
    return 'any';
  }
  
  private static calculateSpecificity(query: string, entities: string[]): 'high' | 'medium' | 'low' {
    // High specificity indicators
    if (entities.length >= 2 || query.length > 50 || query.includes('"')) {
      return 'high';
    }
    
    // Medium specificity indicators
    if (entities.length === 1 || query.length > 20) {
      return 'medium';
    }
    
    return 'low';
  }
  
  private static extractTimeframe(query: string): 'recent' | 'specific' | 'any' {
    const recentKeywords = ['recent', 'latest', 'new', 'today', 'yesterday', 'this week'];
    const specificKeywords = ['2023', '2024', 'january', 'february', 'march', 'april', 'may', 'june'];
    
    if (recentKeywords.some(keyword => query.includes(keyword))) {
      return 'recent';
    }
    
    if (specificKeywords.some(keyword => query.includes(keyword))) {
      return 'specific';
    }
    
    return 'any';
  }
  
  private static calculateIntentConfidence(
    query: string, 
    entities: string[], 
    specificity: string
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Boost for specific entities
    confidence += entities.length * 0.2;
    
    // Boost for specificity
    if (specificity === 'high') confidence += 0.3;
    else if (specificity === 'medium') confidence += 0.1;
    
    // Boost for proper sentence structure
    if (query.includes('?') || query.split(' ').length > 3) {
      confidence += 0.1;
    }
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Validates if content matches the analyzed query intent
   */
  static validateContentAgainstIntent(
    intent: QueryIntent,
    content: { title: string; metadata?: any }
  ): { matches: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    
    const titleLower = content.title.toLowerCase();
    
    // Check primary entity matches
    let entityMatches = 0;
    for (const entity of intent.primaryEntities) {
      if (titleLower.includes(entity) || 
          (content.metadata?.channel_name && 
           content.metadata.channel_name.toLowerCase().includes(entity))) {
        entityMatches++;
        score += 0.4;
        reasons.push(`Entity match: ${entity}`);
      }
    }
    
    // Require at least one entity match for high specificity queries
    if (intent.specificity === 'high' && entityMatches === 0) {
      reasons.push('No entity matches for high-specificity query');
      return { matches: false, score: 0, reasons };
    }
    
    // Content type validation
    if (intent.contentType !== 'any') {
      const isVideo = content.metadata?.is_transcription === true;
      const contentMatches = (intent.contentType === 'video' && isVideo) || 
                           (intent.contentType === 'text' && !isVideo);
      
      if (contentMatches) {
        score += 0.2;
        reasons.push(`Content type match: ${intent.contentType}`);
      } else {
        score -= 0.3;
        reasons.push(`Content type mismatch: expected ${intent.contentType}`);
      }
    }
    
    // Timeframe validation
    if (intent.timeframe === 'recent' && content.metadata?.created_at) {
      const createdDate = new Date(content.metadata.created_at);
      const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreated <= 7) {
        score += 0.2;
        reasons.push('Recent content matches timeframe preference');
      } else if (daysSinceCreated > 30) {
        score -= 0.1;
        reasons.push('Content not recent as requested');
      }
    }
    
    // Final validation
    const matches = score >= 0.3 && (intent.specificity !== 'high' || entityMatches > 0);
    
    return { matches, score: Math.max(0, Math.min(1, score)), reasons };
  }
}
