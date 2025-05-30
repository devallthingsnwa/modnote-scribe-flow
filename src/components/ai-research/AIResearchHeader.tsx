
import React from "react";
import { MessageSquare, Search, BarChart3, Users, Zap } from "lucide-react";
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
    <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Research</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Intelligent search and chat across your knowledge base
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mode Toggle */}
            <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/50">
              <Button
                variant={!isChatMode ? "secondary" : "ghost"}
                size="sm"
                onClick={onToggleMode}
                className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                {searchCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5 min-w-5">
                    {searchCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={isChatMode ? "secondary" : "ghost"}
                size="sm"
                onClick={onToggleMode}
                className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
                {chatCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5 min-w-5">
                    {chatCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Status Indicators */}
            <div className="hidden md:flex items-center space-x-2">
              {isChatMode ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs">AI Ready</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-xs">Instant Search</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Status Bar */}
        <div className="md:hidden mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {isChatMode ? (
              <>
                <MessageSquare className="h-3 w-3" />
                <span>AI Chat Mode</span>
              </>
            ) : (
              <>
                <Search className="h-3 w-3" />
                <span>Search Mode</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span>Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
