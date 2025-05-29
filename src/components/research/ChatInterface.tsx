
import { useRef, useEffect } from "react";
import { Bot, Send, Loader2, Clock, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  responseTime?: number;
  tokenCount?: number;
}

interface ChatInterfaceProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isLoading: boolean;
  streamingContent: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ChatInterface({ 
  chatMessages, 
  chatInput, 
  setChatInput, 
  isLoading, 
  streamingContent, 
  onSubmit, 
  onCancel 
}: ChatInterfaceProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, streamingContent]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      <ScrollArea className="h-36 mb-2">
        {chatMessages.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>Lightning-fast AI responses!</p>
            <p className="text-xs mt-1 opacity-75">Enhanced context processing</p>
          </div>
        ) : (
          <div className="space-y-2">
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
                    "max-w-[85%] rounded-lg px-2 py-1 text-xs",
                    message.type === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.type === 'assistant' && (
                    <div className="mt-1 pt-1 border-t border-muted-foreground/20">
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        {message.responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-2 w-2" />
                            <span>{message.responseTime.toFixed(0)}ms</span>
                          </div>
                        )}
                        {message.tokenCount && (
                          <div className="flex items-center gap-1">
                            <Zap className="h-2 w-2" />
                            <span>{message.tokenCount} chars</span>
                          </div>
                        )}
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.sources.map((source) => (
                            <Badge key={source.id} variant="secondary" className="text-xs h-4 px-1">
                              {source.title.substring(0, 15)}...
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(isLoading || streamingContent) && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-2 py-1 max-w-[85%]">
                  {streamingContent ? (
                    <p className="text-xs whitespace-pre-wrap">{streamingContent}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </ScrollArea>
      
      <div className="flex gap-1">
        <Input
          placeholder="Ask anything..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 text-xs h-7"
          disabled={isLoading}
        />
        {isLoading ? (
          <Button
            onClick={onCancel}
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            title="Cancel request"
          >
            ×
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={!chatInput.trim()}
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        )}
      </div>
    </>
  );
}
