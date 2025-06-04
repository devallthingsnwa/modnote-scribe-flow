
import { useRef, useEffect } from "react";
import { Bot, User, Send, Loader2, Brain, Zap, X, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EnhancedSearchResult {
  id: string;
  title: string;
  content: string | null;
  relevance: number;
  snippet: string;
  sourceType: 'video' | 'note';
  metadata?: {
    searchMethod?: string;
  };
}

interface EnhancedChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: EnhancedSearchResult[];
  responseTime?: number;
  contextQuality?: number;
  searchStrategy?: string;
}

interface EnhancedPerformanceMetrics {
  searchTime: number;
  contextTime: number;
  apiTime: number;
  totalTime: number;
  cacheHitRate: number;
  searchStrategy: string;
  contextQuality: number;
}

interface EnhancedChatInterfaceProps {
  chatMessages: EnhancedChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onClear: () => void;
  metrics?: EnhancedPerformanceMetrics | null;
  searchStrategy: string;
}

export function EnhancedChatInterface({ 
  chatMessages, 
  chatInput, 
  setChatInput, 
  isLoading, 
  onSubmit, 
  onCancel,
  onClear,
  metrics,
  searchStrategy
}: EnhancedChatInterfaceProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium">Enhanced RAG Assistant Ready</p>
            <p className="text-sm mt-1 opacity-75">
              Ask me anything about your knowledge base using {searchStrategy} search
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Ultra-fast responses
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                Smart context
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
                  message.type === 'user' 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white" 
                    : "bg-white dark:bg-muted border border-border/50"
                )}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {/* Enhanced Message Metadata */}
                  {message.type === 'assistant' && (
                    <div className="mt-3 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          {message.responseTime && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {message.responseTime.toFixed(0)}ms
                            </span>
                          )}
                          {message.contextQuality && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              {(message.contextQuality * 100).toFixed(0)}% quality
                            </span>
                          )}
                          {message.searchStrategy && (
                            <Badge variant="outline" className="h-5 px-1 text-xs">
                              {message.searchStrategy}
                            </Badge>
                          )}
                        </div>
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">Sources:</div>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source) => (
                              <Badge key={source.id} variant="secondary" className="text-xs h-5 px-2">
                                <span className="truncate max-w-24">{source.title}</span>
                                <span className="ml-1 opacity-70">
                                  {source.relevance.toFixed(2)}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Enhanced Typing Indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white dark:bg-muted border border-border/50 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Processing with {searchStrategy} search...</span>
                    {isLoading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        className="h-6 px-2 text-xs hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Enhanced Input Area */}
      <div className="p-4 border-t bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10">
        <div className="flex gap-2 mb-2">
          <Input
            ref={inputRef}
            placeholder={`Ask anything using ${searchStrategy} search...`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
          />
          <Button 
            onClick={onSubmit}
            disabled={!chatInput.trim() || isLoading}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          {chatMessages.length > 0 && (
            <Button 
              onClick={onClear}
              variant="outline"
              className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted border rounded">Enter</kbd> to send
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted border rounded">Shift + Enter</kbd> for new line
            </span>
          </div>
          
          {metrics && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                {metrics.totalTime.toFixed(0)}ms total
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                {(metrics.contextQuality * 100).toFixed(0)}% quality
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
