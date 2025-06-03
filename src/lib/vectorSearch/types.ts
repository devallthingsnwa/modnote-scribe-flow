
export interface EnhancedSearchResult {
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
    similarity?: number;
    contentLength?: number;
    keyTerms?: string[];
    topicRelevance?: number;
    searchMethod?: string;
  };
}

export interface SearchStrategy {
  name: string;
  weight: number;
  execute: (query: string, notes: any[]) => Promise<EnhancedSearchResult[]>;
}

export interface SearchOptions {
  useSemanticSearch?: boolean;
  useKeywordSearch?: boolean;
  hybridMode?: boolean;
  contextOptimization?: boolean;
}

export interface CacheEntry {
  results: EnhancedSearchResult[];
  timestamp: number;
  strategy: string;
  queryEmbedding?: number[];
}
