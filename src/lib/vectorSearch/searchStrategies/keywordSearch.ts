
import { EnhancedSearchResult } from '../types';
import { TextUtils } from '../textUtils';

export class KeywordSearchStrategy {
  static async execute(notes: any[], query: string): Promise<EnhancedSearchResult[]> {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const queryPhrases = TextUtils.extractPhrases(queryLower);
    
    return notes
      .map(note => {
        const titleLower = (note.title || '').toLowerCase();
        const contentLower = (note.content || '').toLowerCase();
        
        let relevance = 0;
        
        // Exact phrase matching (highest weight)
        queryPhrases.forEach(phrase => {
          if (titleLower.includes(phrase)) relevance += 0.8;
          if (contentLower.includes(phrase)) relevance += 0.4;
        });
        
        // Word proximity scoring
        relevance += TextUtils.calculateProximityScore(contentLower, queryWords) * 0.3;
        
        // Individual word matching
        queryWords.forEach(word => {
          if (titleLower.includes(word)) relevance += 0.3;
          if (contentLower.includes(word)) relevance += 0.1;
        });
        
        // Content quality bonus
        if (note.content && note.content.length > 500) relevance += 0.1;
        if (note.is_transcription) relevance += 0.05;
        
        if (relevance < 0.15) return null;
        
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          relevance: Math.min(relevance, 1.0),
          snippet: TextUtils.generateEnhancedSnippet(note.content || note.title, query),
          sourceType: note.is_transcription ? 'video' as const : 'note' as const,
          metadata: {
            source_url: note.source_url,
            created_at: note.created_at,
            is_transcription: note.is_transcription,
            channel_name: note.channel_name,
            video_id: note.video_id,
            contentLength: note.content?.length || 0,
            keyTerms: TextUtils.extractKeyTerms(note.content, query),
            searchMethod: 'keyword'
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance) as EnhancedSearchResult[];
  }
}
