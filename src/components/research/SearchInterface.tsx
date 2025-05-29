
import { useRef, useEffect } from "react";
import { Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
}

interface SearchInterfaceProps {
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
}

export function SearchInterface({ searchQuery, searchResults, onSearch }: SearchInterfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      <Input
        ref={inputRef}
        placeholder="Lightning-fast search..."
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full text-xs h-8 mb-2"
      />
      
      <ScrollArea className="h-36">
        {searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div key={result.id} className="p-2 border rounded text-xs hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium truncate pr-2">{result.title}</h4>
                  <Badge variant="outline" className="text-xs h-4 px-1 shrink-0">
                    {result.relevance.toFixed(1)}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs line-clamp-2">
                  {result.snippet}
                </p>
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>No results found</p>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500 opacity-50" />
            <p>Ultra-fast search ready</p>
            <p className="text-xs mt-1 opacity-75">Enhanced with smart caching</p>
          </div>
        )}
      </ScrollArea>
    </>
  );
}
