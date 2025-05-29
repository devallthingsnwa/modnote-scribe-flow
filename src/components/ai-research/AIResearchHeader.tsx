import React from "react";
import { ArrowLeft, Bot, Search, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  return <div className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard">
              
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  AI Research
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Zap className="h-3 w-3" />
                  Enhanced with smart context & lightning-fast caching
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border">
            <Button variant={!isChatMode ? "default" : "ghost"} onClick={onToggleMode} className={cn("flex items-center gap-2 transition-all duration-200", !isChatMode ? "shadow-sm" : "hover:bg-muted/60")} size="sm">
              <Search className="h-4 w-4" />
              Search
              {searchResults.length > 0 && !isChatMode && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
                  {searchResults.length}
                </Badge>}
            </Button>
            <Button variant={isChatMode ? "default" : "ghost"} onClick={onToggleMode} className={cn("flex items-center gap-2 transition-all duration-200", isChatMode ? "shadow-sm" : "hover:bg-muted/60")} size="sm">
              <Bot className="h-4 w-4" />
              Chat
              {chatMessages.length > 0 && isChatMode && <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
                  {Math.floor(chatMessages.length / 2)}
                </Badge>}
            </Button>
          </div>
        </div>
      </div>
    </div>;
}