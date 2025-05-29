
import React from "react";
import { Bot, Loader2, Send, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface ChatModeProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  isLoading: boolean;
  onChatInputChange: (value: string) => void;
  onChatSubmit: () => void;
}

export function ChatMode({ 
  chatMessages, 
  chatInput, 
  isLoading, 
  onChatInputChange, 
  onChatSubmit 
}: ChatModeProps) {
  return (
    <div className="space-y-6">
      <ScrollArea className="h-[500px] mb-6 pr-4">
        {chatMessages.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-fit mx-auto mb-6">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">AI Assistant Ready</h3>
            <p className="text-muted-foreground text-lg mb-2">
              Ask me anything about your notes and I'll find the answers instantly
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <Badge variant="outline" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Optimized context
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Fast responses
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-6 py-4 shadow-sm",
                    message.type === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/70 border border-border/50"
                  )}
                >
                  {message.isStreaming ? (
                    <div className="flex items-center space-x-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Processing with optimized context...</span>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-muted-foreground/20">
                          <p className="text-xs font-medium mb-3 text-muted-foreground">
                            Sources ({message.sources.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source) => (
                              <Link key={source.id} to={`/note/${source.id}`}>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs hover:bg-secondary/80 transition-colors cursor-pointer"
                                >
                                  {source.title.substring(0, 25)}...
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="flex gap-3 p-2 bg-muted/30 rounded-xl border border-border/50">
        <Input
          placeholder="Ask about your notes..."
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onChatSubmit()}
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base"
        />
        <Button
          onClick={onChatSubmit}
          disabled={!chatInput.trim() || isLoading}
          className="px-4"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
