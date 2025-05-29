
import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Bot, Search, Loader2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  isStreaming?: boolean;
}

export default function AIResearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const { toast } = useToast();
  const { data: notes } = useNotes();

  // Memoized search function with debouncing
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!notes || !query.trim()) {
          setSearchResults([]);
          return;
        }
        
        const results = OptimizedSearchService.searchNotes(notes, query);
        setSearchResults(results);
      }, 300); // 300ms debounce
    };
  }, [notes]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isLoading) return;

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

    // Add streaming placeholder
    const streamingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: "",
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, streamingMessage]);

    try {
      // Process context efficiently
      const contextData = ContextProcessor.processNotesForContext(notes || [], currentInput);
      
      const knowledgeBase = contextData.relevantChunks.join('\n\n---\n\n');
      
      const ragContext = knowledgeBase ? 
        `Context from notes (${contextData.totalTokens} chars):\n\n${knowledgeBase}\n\nUser question: ${currentInput}` : 
        currentInput;

      console.log(`Optimized context size: ${ragContext.length} chars from ${contextData.sources.length} sources`);

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ragContext,
          type: 'chat',
          options: { rag: true }
        }
      });

      if (error) throw error;

      // Remove streaming placeholder and add final response
      setChatMessages(prev => prev.filter(m => !m.isStreaming));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: data.processedContent || "I'm sorry, I couldn't process your request.",
        timestamp: new Date(),
        sources: contextData.sources.map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Relevance: ${source.relevance.toFixed(1)}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      // Show performance info
      if (data.usage) {
        console.log('API Usage:', data.usage);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => prev.filter(m => !m.isStreaming));
      
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = useCallback(() => {
    setIsChatMode(!isChatMode);
    if (!isChatMode) {
      setSearchResults([]);
      setSearchQuery("");
    } else {
      setChatMessages([]);
    }
  }, [isChatMode]);

  // Clear cache when component unmounts
  React.useEffect(() => {
    return () => OptimizedSearchService.clearCache();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">AI Research</h1>
                <p className="text-muted-foreground">Enhanced with smart context & caching</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={!isChatMode ? "default" : "outline"}
                onClick={toggleMode}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
              <Button
                variant={isChatMode ? "default" : "outline"}
                onClick={toggleMode}
                className="flex items-center gap-2"
              >
                <Bot className="h-4 w-4" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            {!isChatMode ? (
              // Optimized Search Mode
              <div className="space-y-6">
                <div>
                  <Input
                    placeholder="Search across all your notes and transcripts..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="text-lg p-6"
                  />
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Found {searchResults.length} results • Smart ranking enabled
                    </p>
                  )}
                </div>
                
                <ScrollArea className="h-96">
                  {searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <Link key={result.id} to={`/note/${result.id}`}>
                          <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold">{result.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                Score: {result.relevance.toFixed(1)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm line-clamp-3">
                              {result.snippet}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No results found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start typing to search your notes and transcripts</p>
                      <p className="text-sm mt-2">Enhanced with smart ranking and caching</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              // Optimized Chat Mode
              <div className="space-y-6">
                <ScrollArea className="h-96 mb-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Ask me anything about your notes!</p>
                      <p className="text-sm mt-2">Optimized for faster responses with smart context processing</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
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
                              "max-w-[80%] rounded-lg px-4 py-3",
                              message.type === 'user'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            {message.isStreaming ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Processing optimized context...</span>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                {message.sources && message.sources.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                                    <p className="text-xs font-medium mb-2">Sources ({message.sources.length}):</p>
                                    <div className="flex flex-wrap gap-2">
                                      {message.sources.map((source) => (
                                        <Link key={source.id} to={`/note/${source.id}`}>
                                          <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                                            {source.title.substring(0, 20)}...
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
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about your notes..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
