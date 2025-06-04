
import { useRef, useEffect } from "react";
import { Search, Filter, Zap, TrendingUp, Clock, FileText, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

interface AdvancedSearchInterfaceProps {
  searchQuery: string;
  searchResults: EnhancedSearchResult[];
  searchMetrics?: SearchMetrics | null;
  onSearch: (query: string) => void;
  onClear: () => void;
  searchStrategy: string;
}

export function AdvancedSearchInterface({ 
  searchQuery, 
  searchResults, 
  searchMetrics,
  onSearch, 
  onClear,
  searchStrategy
}: AdvancedSearchInterfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={`Enhanced ${searchStrategy} search...`}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            />
          </div>
          {searchQuery && (
            <Button 
              onClick={onClear}
              variant="outline"
              className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
              Clear
            </Button>
          )}
        </div>
        
        {/* Search Metrics */}
        {searchMetrics && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {searchMetrics.searchTime.toFixed(1)}ms
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {(searchMetrics.qualityScore * 100).toFixed(0)}% quality
              </span>
              <Badge variant="outline" className="h-5 px-2">
                {searchMetrics.resultCount} results
              </Badge>
              {searchMetrics.cacheHit && (
                <Badge variant="outline" className="h-5 px-2 bg-green-50 text-green-700">
                  <Zap className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="h-5 px-2 capitalize">
              {searchMetrics.strategy} search
            </Badge>
          </div>
        )}
      </div>
      
      {/* Results */}
      <ScrollArea className="flex-1 p-4">
        {searchResults.length > 0 ? (
          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <Card key={result.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-all border-l-4 border-l-purple-200 hover:border-l-purple-400">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.sourceType === 'video' ? (
                      <Video className="h-4 w-4 text-red-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    <h3 className="font-medium text-sm line-clamp-1">{result.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Badge variant="outline" className="text-xs h-5 px-2">
                      {result.relevance.toFixed(3)}
                    </Badge>
                    {result.metadata?.searchMethod && (
                      <Badge variant="secondary" className="text-xs h-5 px-2 capitalize">
                        {result.metadata.searchMethod}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                  {result.snippet}
                </p>
                
                {/* Enhanced Metadata */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {result.metadata?.contentLength && (
                      <span className="text-muted-foreground">
                        {(result.metadata.contentLength / 1000).toFixed(1)}k chars
                      </span>
                    )}
                    {result.metadata?.created_at && (
                      <span className="text-muted-foreground">
                        {new Date(result.metadata.created_at).toLocaleDateString()}
                      </span>
                    )}
                    {result.metadata?.topicRelevance && (
                      <span className="text-muted-foreground">
                        {(result.metadata.topicRelevance * 100).toFixed(0)}% topic match
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">#{index + 1}</span>
                  </div>
                </div>
                
                {/* Key Terms */}
                {result.metadata?.keyTerms && result.metadata.keyTerms.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <div className="flex flex-wrap gap-1">
                      {result.metadata.keyTerms.slice(0, 3).map((term, i) => (
                        <Badge key={i} variant="outline" className="text-xs h-4 px-1">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium">No results found</p>
            <p className="text-sm mt-1 opacity-75">
              Try different keywords or switch search strategies
            </p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <Search className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-base font-medium">Enhanced Search Ready</p>
            <p className="text-sm mt-1 opacity-75">
              Start typing to search with {searchStrategy} intelligence
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Smart caching
              </Badge>
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Quality scoring
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Context optimization
              </Badge>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
