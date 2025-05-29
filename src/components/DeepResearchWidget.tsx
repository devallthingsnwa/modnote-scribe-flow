
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Bot, Send, Loader2, ChevronDown, ChevronUp, Zap, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useNotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedSearchService } from "@/lib/aiResearch/searchService";
import { ContextProcessor } from "@/lib/aiResearch/contextProcessor";

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

interface PerformanceMetrics {
  searchTime: number;
  contextTime: number;
  apiTime: number;
  totalTime: number;
}

export function DeepResearchWidget() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, streamingContent]);

  // Optimized search with enhanced debouncing and caching
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!notes || !query.trim()) {
          setSearchResults([]);
          return;
        }
        
        const searchStart = performance.now();
        const results = OptimizedSearchService.searchNotes(notes, query);
        const searchTime = performance.now() - searchStart;
        
        setSearchResults(results.slice(0, 6)); // Increased for widget
        setMetrics(prev => ({ ...prev, searchTime } as PerformanceMetrics));
      }, 150); // Faster debounce
    };
  }, [notes]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isLoading) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = performance.now();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      // Enhanced context processing with timing
      const contextStart = performance.now();
      const contextData = ContextProcessor.processNotesForContext(notes || [], currentInput);
      const contextTime = performance.now() - contextStart;
      
      const knowledgeBase = contextData.relevantChunks.join('\n\n---\n\n');
      
      const ragContext = knowledgeBase ? 
        `Context (${contextData.totalTokens} chars from ${contextData.sources.length} sources):\n\n${knowledgeBase}\n\nQ: ${currentInput}` : 
        currentInput;

      console.log(`⚡ Ultra-fast context: ${contextTime.toFixed(1)}ms | ${contextData.totalTokens} chars | ${contextData.sources.length} sources`);

      // Streaming API call with performance tracking
      const apiStart = performance.now();
      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ragContext,
          type: 'chat',
          options: { rag: true },
          stream: false // For now, keeping non-streaming for stability
        }
      });

      if (controller.signal.aborted) return;

      const apiTime = performance.now() - apiStart;
      const totalTime = performance.now() - startTime;

      if (error) throw error;

      const responseMetrics: PerformanceMetrics = {
        searchTime: 0,
        contextTime,
        apiTime,
        totalTime
      };

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.processedContent || "I'm sorry, I couldn't process your request.",
        timestamp: new Date(),
        responseTime: totalTime,
        tokenCount: data.usage?.total_tokens || contextData.totalTokens,
        sources: contextData.sources.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Score: ${source.relevance.toFixed(1)}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setMetrics(responseMetrics);

      // Performance feedback
      if (totalTime < 2000) {
        console.log(`🚀 Lightning fast response: ${totalTime.toFixed(0)}ms`);
      } else if (totalTime < 5000) {
        console.log(`⚡ Good response time: ${totalTime.toFixed(0)}ms`);
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Request cancelled by user');
        return;
      }
      
      console.error('Enhanced chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingContent("");
      toast({
        title: "Request Cancelled",
        description: "The AI request was cancelled.",
      });
    }
  }, [toast]);

  const toggleMode = useCallback(() => {
    setIsChatMode(!isChatMode);
    if (!isChatMode) {
      setSearchResults([]);
      setSearchQuery("");
    } else {
      setChatMessages([]);
      setMetrics(null);
    }
  }, [isChatMode]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    setMetrics(null);
    OptimizedSearchService.clearCache();
    toast({
      title: "Chat Cleared",
      description: "Conversation history and cache cleared.",
    });
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      OptimizedSearchService.clearCache();
    };
  }, []);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 py-1 h-auto">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Ultra AI Research</span>
            {metrics && (
              <Badge variant="outline" className="text-xs h-4 px-1">
                {metrics.totalTime.toFixed(0)}ms
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-2 mt-2">
        <Card className="shadow-sm border-2">
          <CardHeader className="p-3 pb-2">
            <div className="flex gap-1">
              <Button
                variant={!isChatMode ? "default" : "outline"}
                size="sm"
                onClick={toggleMode}
                className="flex-1 h-7 text-xs"
              >
                <Search className="h-3 w-3 mr-1" />
                Search
                {searchResults.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-3 px-1 text-xs">
                    {searchResults.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={isChatMode ? "default" : "outline"}
                size="sm"
                onClick={toggleMode}
                className="flex-1 h-7 text-xs"
              >
                <Bot className="h-3 w-3 mr-1" />
                Chat
                {chatMessages.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-3 px-1 text-xs">
                    {Math.floor(chatMessages.length / 2)}
                  </Badge>
                )}
              </Button>
              {isChatMode && chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-7 w-7 p-0"
                  title="Clear chat"
                >
                  ×
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-3 pt-0">
            {!isChatMode ? (
              <>
                <Input
                  ref={inputRef}
                  placeholder="Lightning-fast search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full text-xs h-8 mb-2"
                />
                
                <ScrollArea className="h-36">
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div key={result.id} className="p-2 border rounded text-xs hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-medium truncate pr-2">{result.title}</h4>
                            <Badge variant="outline" className="text-xs h-4 px-1 shrink-0">
                              {result.relevance.toFixed(1)}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs line-clamp-2">
                            {result.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p>No results found</p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-500 opacity-50" />
                      <p>Ultra-fast search ready</p>
                      <p className="text-xs mt-1 opacity-75">Enhanced with smart caching</p>
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
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
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                    className="flex-1 text-xs h-7"
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <Button
                      onClick={cancelRequest}
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Cancel request"
                    >
                      ×
                    </Button>
                  ) : (
                    <Button
                      onClick={handleChatSubmit}
                      disabled={!chatInput.trim()}
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {metrics && (
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    Context: {metrics.contextTime.toFixed(0)}ms | API: {metrics.apiTime.toFixed(0)}ms | Total: {metrics.totalTime.toFixed(0)}ms
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
