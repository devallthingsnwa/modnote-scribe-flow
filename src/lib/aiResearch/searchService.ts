
import { EnhancedSearchService } from './enhancedSearchService';

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
  };
}

export class OptimizedSearchService {
  /**
   * @deprecated Use EnhancedSearchService.searchNotes instead
   */
  static searchNotes(notes: any[], query: string): SearchResult[] {
    console.warn('⚠️ OptimizedSearchService is deprecated. Use EnhancedSearchService for better accuracy.');
    return EnhancedSearchService.searchNotes(notes, query);
  }

  static clearCache(): void {
    EnhancedSearchService.clearCache();
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return EnhancedSearchService.getCacheStats();
  }
}
