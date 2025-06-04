
import { useState, useCallback } from "react";
import { useNotes } from "@/lib/api";
import { HybridSearchStrategy } from "@/lib/vectorSearch/searchStrategies/hybridSearch";
import { SemanticSearchStrategy } from "@/lib/vectorSearch/searchStrategies/semanticSearch";
import { KeywordSearchStrategy } from "@/lib/vectorSearch/searchStrategies/keywordSearch";
import { SearchCache } from "@/lib/vectorSearch/searchCache";
import { EnhancedSearchResult, SearchOptions } from "@/lib/vectorSearch/types";

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

  const executeSearch = useCallback(async (query: string, searchOptions: SearchOptions): Promise<EnhancedSearchResult[]> => {
    if (searchOptions.hybridMode) {
      return await HybridSearchStrategy.execute(notes || [], query);
    } else if (searchOptions.useSemanticSearch) {
      return await SemanticSearchStrategy.execute(notes || [], query);
    } else {
      return await KeywordSearchStrategy.execute(notes || [], query);
    }
  }, [notes]);

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
      // Check cache first
      const cacheKey = `${query.toLowerCase().trim()}_${strategy}`;
      const cachedResults = SearchCache.get(cacheKey);
      
      let results: EnhancedSearchResult[];
      let cacheHit = false;
      
      if (cachedResults) {
        results = cachedResults;
        cacheHit = true;
      } else {
        const searchOptions = {
          useSemanticSearch: strategy === 'semantic' || strategy === 'hybrid',
          useKeywordSearch: strategy === 'keyword' || strategy === 'hybrid',
          hybridMode: strategy === 'hybrid',
          contextOptimization: true
        };
        
        results = await executeSearch(query, searchOptions);
        SearchCache.set(cacheKey, results, strategy);
      }
      
      const searchTime = performance.now() - searchStart;
      
      // Calculate quality score
      const qualityScore = results.length > 0 ? 
        results.reduce((sum, r) => sum + r.relevance, 0) / results.length : 0;
      
      setSearchResults(results);
      setSearchMetrics({
        searchTime,
        resultCount: results.length,
        strategy,
        cacheHit,
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
  }, [notes, executeSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchMetrics(null);
    SearchCache.clear();
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
