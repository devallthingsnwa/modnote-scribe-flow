
import { useState, useRef, useEffect } from "react";
import { Search, X, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotes } from "@/lib/api";

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
}

interface SearchBarProps {
  onNoteSelect?: (noteId: string) => void;
  className?: string;
}

export function SearchBar({ onNoteSelect, className }: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notes } = useNotes();

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const searchNotes = (query: string) => {
    if (!notes || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = notes
      .map(note => {
        const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
        const contentMatch = note.content?.toLowerCase().includes(query.toLowerCase()) || false;
        
        if (!titleMatch && !contentMatch) return null;

        // Calculate relevance score
        let relevance = 0;
        if (titleMatch) relevance += 2;
        if (contentMatch) relevance += 1;

        // Create snippet
        let snippet = '';
        if (note.content) {
          const queryIndex = note.content.toLowerCase().indexOf(query.toLowerCase());
          if (queryIndex !== -1) {
            const start = Math.max(0, queryIndex - 50);
            const end = Math.min(note.content.length, queryIndex + query.length + 50);
            snippet = '...' + note.content.substring(start, end) + '...';
          } else {
            snippet = note.content.substring(0, 100) + '...';
          }
        }

        return {
          id: note.id,
          title: note.title,
          content: note.content,
          relevance,
          snippet
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance)
      .slice(0, 8) as SearchResult[];

    setSearchResults(results);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchNotes(query);
  };

  const handleResultClick = (noteId: string) => {
    onNoteSelect?.(noteId);
    setIsExpanded(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          className={cn(
            "pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-200",
            isExpanded ? "ring-2 ring-primary/20" : ""
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isExpanded && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg border bg-background/95 backdrop-blur-sm">
          {searchResults.length > 0 ? (
            <ScrollArea className="max-h-80">
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    Smart Search
                  </Badge>
                </div>
                <div className="space-y-1">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => handleResultClick(result.id)}
                      className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                          {result.title}
                        </h4>
                        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                          {result.relevance === 3 ? 'Perfect' : result.relevance === 2 ? 'Good' : 'Match'}
                        </Badge>
                      </div>
                      {result.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {result.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : searchQuery ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notes found for "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Start typing to search your notes</p>
              <p className="text-xs text-muted-foreground mt-1">AI-powered search with smart suggestions</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
