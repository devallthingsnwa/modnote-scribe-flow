
import React from "react";
import { Search, Database, Zap, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
}

interface SearchModeProps {
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
}

export function SearchMode({ searchQuery, searchResults, onSearch }: SearchModeProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search across all your notes and transcripts..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="text-lg pl-12 pr-6 py-6 border-2 focus:border-primary/50 transition-colors bg-background/50"
          />
        </div>
        {searchQuery && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Found {searchResults.length} results</span>
              <Badge variant="outline" className="text-xs">
                Smart ranking enabled
              </Badge>
            </div>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span>Lightning fast</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        {searchResults.length > 0 ? (
          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <Link key={result.id} to={`/note/${result.id}`}>
                <div className="group p-6 border border-border/60 rounded-xl hover:bg-muted/30 hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-md">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                        Score: {result.relevance.toFixed(1)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                    {result.snippet}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-20">
            <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-6">
              <Search className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              No matches for "<span className="font-medium">{searchQuery}</span>"
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try different keywords or check spelling
            </p>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-fit mx-auto mb-6">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Start your research</h3>
            <p className="text-muted-foreground text-lg mb-2">
              Search through your notes and transcripts with AI-powered precision
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Smart ranking
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Fast caching
              </Badge>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
