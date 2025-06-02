
import { useState, useCallback } from "react";
import { useNotes } from "@/lib/api";
import { AdvancedSemanticEngine } from "@/lib/vectorSearch/advancedSemanticEngine";

interface EnhancedSearchResult {
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

interface SearchMetrics {
  searchTime: number;
  resultCount: number;
  strategy: string;
  cacheHit: boolean;
  qualityScore: number;
}

export function useEnhancedSemanticSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EnhancedSearchResult[]>([]);
  const [searchMetrics, setSearchMetrics] = useState<SearchMetrics | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { data: notes } = useNotes();

  const handleSearch = useCallback(async (query: string, strategy: 'hybrid' | 'semantic' | 'keyword' = 'hybrid') => {
    setSearchQuery(query);
    
    if (!notes || !query.trim()) {
      setSearchResults([]);
      setSearchMetrics(null);
      return;
    }
    
    setIsSearching(true);
    const searchStart = performance.now();
    
    try {
      const searchOptions = {
        useSemanticSearch: strategy === 'semantic' || strategy === 'hybrid',
        useKeywordSearch: strategy === 'keyword' || strategy === 'hybrid',
        hybridMode: strategy === 'hybrid',
        contextOptimization: true
      };
      
      const results = await AdvancedSemanticEngine.enhancedSearch(notes, query, searchOptions);
      const searchTime = performance.now() - searchStart;
      
      // Calculate quality score
      const qualityScore = results.length > 0 ? 
        results.reduce((sum, r) => sum + r.relevance, 0) / results.length : 0;
      
      setSearchResults(results);
      setSearchMetrics({
        searchTime,
        resultCount: results.length,
        strategy,
        cacheHit: searchTime < 50, // Approximate cache hit detection
        qualityScore
      });
      
      console.log(`🔍 Enhanced search: ${searchTime.toFixed(1)}ms, ${results.length} results, quality: ${(qualityScore * 100).toFixed(1)}%`);
    } catch (error) {
      console.error('Enhanced search error:', error);
      setSearchResults([]);
      setSearchMetrics(null);
    } finally {
      setIsSearching(false);
    }
  }, [notes]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchMetrics(null);
    AdvancedSemanticEngine.clearCache();
  }, []);

  return {
    searchQuery,
    searchResults,
    searchMetrics,
    isSearching,
    handleSearch,
    clearSearch
  };
}
