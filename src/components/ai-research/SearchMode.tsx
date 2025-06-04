
import React from "react";
import { Search, Zap, FileText, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
  sourceType?: 'video' | 'note';
  metadata?: {
    source_url?: string;
    created_at?: string;
    is_transcription?: boolean;
    channel_name?: string;
  };
}

interface SearchModeProps {
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
}

export function SearchMode({ searchQuery, searchResults, onSearch }: SearchModeProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search with enhanced accuracy... (e.g., 'Asmongold gaming', 'Seth Godin marketing')"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 h-12 text-base border-2 focus:border-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Zap className="h-3 w-3 text-yellow-500" />
          Enhanced with strict relevance matching
        </p>
      </div>

      <div className="flex-1">
        {searchResults.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {searchResults.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {result.sourceType === 'video' ? (
                          <Video className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                          {result.title}
                        </h3>
                      </div>
                      <Badge 
                        variant={result.relevance > 2 ? "default" : "secondary"}
                        className="ml-2 flex-shrink-0"
                      >
                        {result.relevance.toFixed(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {result.snippet}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs">
                      {result.metadata?.channel_name && (
                        <Badge variant="outline" className="text-xs">
                          {result.metadata.channel_name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {result.sourceType === 'video' ? 'Video Transcript' : 'Text Note'}
                      </Badge>
                      {result.metadata?.created_at && (
                        <span className="text-muted-foreground">
                          {new Date(result.metadata.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : searchQuery ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No relevant results found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No content matches your search criteria. Try different keywords or check if the content exists in your notes.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-500/50" />
            <h3 className="text-lg font-medium mb-2">Enhanced Search Ready</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start typing to search your notes with improved accuracy. The system now better matches your intent with relevant content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
