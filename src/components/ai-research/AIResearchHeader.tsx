
import React from "react";
import { MessageSquare, Search, BarChart3, Shield, Zap, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SearchResult[];
  isStreaming?: boolean;
}

interface AIResearchHeaderProps {
  isChatMode: boolean;
  searchResults: SearchResult[];
  chatMessages: ChatMessage[];
  onToggleMode: () => void;
}

export function AIResearchHeader({
  isChatMode,
  searchResults,
  chatMessages,
  onToggleMode
}: AIResearchHeaderProps) {
  const searchCount = searchResults.length;
  const chatCount = chatMessages.filter(m => m.type === 'assistant').length;

  return (
    <header className="border-b border-border/30 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 shadow-sm">
      <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Enhanced Title Section */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl border border-primary/20">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  AI Research Hub
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Secure intelligent search with verified source attribution
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Enhanced Mode Toggle */}
            <div className="flex items-center bg-muted/40 rounded-xl p-1 border border-border/50 shadow-sm">
              <Button
                variant={!isChatMode ? "default" : "ghost"}
                size="sm"
                onClick={onToggleMode}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Instant Search</span>
                <span className="sm:hidden">Search</span>
                {searchCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4 min-w-4 ml-1">
                    {searchCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={isChatMode ? "default" : "ghost"}
                size="sm"
                onClick={onToggleMode}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-200"
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">AI Chat</span>
                <span className="sm:hidden">Chat</span>
                {chatCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4 min-w-4 ml-1">
                    {chatCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Enhanced Status Indicators */}
            <div className="hidden lg:flex items-center space-x-3">
              {isChatMode ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/30">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium">Verified Sources</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/30">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium">Lightning Search</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Mobile Status Bar */}
        <div className="lg:hidden mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {isChatMode ? (
              <>
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium">AI Chat Mode</span>
                <Badge variant="outline" className="text-xs h-4 px-1.5">
                  <Shield className="h-2 w-2 mr-1" />
                  Verified
                </Badge>
              </>
            ) : (
              <>
                <Search className="h-3 w-3" />
                <span className="font-medium">Search Mode</span>
                <Badge variant="outline" className="text-xs h-4 px-1.5">
                  <Zap className="h-2 w-2 mr-1" />
                  Instant
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs">Ready</span>
            </div>
            <Database className="h-3 w-3 opacity-60" />
          </div>
        </div>

        {/* Mode Description */}
        <div className="mt-2 sm:mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isChatMode ? (
                <>
                  <span className="font-medium text-primary">AI Chat:</span> Get intelligent responses with strict source attribution from your verified notes
                </>
              ) : (
                <>
                  <span className="font-medium text-blue-600">Instant Search:</span> Lightning-fast local search across all your notes and transcripts
                </>
              )}
            </p>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              {isChatMode && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-2 w-2 mr-1" />
                  Source Verified
                </Badge>
              )}
              {!isChatMode && searchCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {searchCount} results
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
