
import { useState, useMemo, useCallback } from "react";
import { useNotes } from "@/lib/api";
import { SemanticSearchEngine } from "@/lib/vectorSearch/semanticSearchEngine";

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
}

export function useSemanticSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const { data: notes } = useNotes();

  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return async (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!notes || !query.trim()) {
          setSearchResults([]);
          return;
        }
        
        const searchStart = performance.now();
        const results = await SemanticSearchEngine.searchNotes(notes, query);
        const searchTime = performance.now() - searchStart;
        
        setSearchResults(results.slice(0, 6));
        console.log(`⚡ Search completed: ${searchTime.toFixed(1)}ms, ${results.length} results`);
      }, 150);
    };
  }, [notes]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  return {
    searchQuery,
    searchResults,
    handleSearch
  };
}
