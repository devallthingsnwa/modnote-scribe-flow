import React, { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Bot, Search, Loader2, Send, Sparkles, Database, Zap } from "lucide-react";
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
import { Sidebar } from "@/components/Sidebar";

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
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Enhanced Header */}
        <div className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="hover:bg-muted/60 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
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
              
              {/* Enhanced Mode Toggle */}
              <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border">
                <Button
                  variant={!isChatMode ? "default" : "ghost"}
                  onClick={toggleMode}
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    !isChatMode ? "shadow-sm" : "hover:bg-muted/60"
                  )}
                  size="sm"
                >
                  <Search className="h-4 w-4" />
                  Search
                  {searchResults.length > 0 && !isChatMode && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
                      {searchResults.length}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={isChatMode ? "default" : "ghost"}
                  onClick={toggleMode}
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    isChatMode ? "shadow-sm" : "hover:bg-muted/60"
                  )}
                  size="sm"
                >
                  <Bot className="h-4 w-4" />
                  Chat
                  {chatMessages.length > 0 && isChatMode && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
                      {Math.floor(chatMessages.length / 2)}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="flex-1 px-6 py-8 overflow-auto">
          <Card className="max-w-5xl mx-auto shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8">
              {!isChatMode ? (
                // Enhanced Search Mode
                <div className="space-y-8">
                  {/* Search Input Section */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Search across all your notes and transcripts..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="text-lg pl-12 pr-6 py-6 border-2 focus:border-primary/50 transition-colors bg-background/50"
                      />
                    </div>
                    {searchQuery && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <span>Found {searchResults.length} results</span>
                          <Badge variant="outline" className="text-xs">
                            Smart ranking enabled
                          </Badge>
                        </div>
                        {searchResults.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Zap className="h-3 w-3 text-yellow-500" />
                            <span>Lightning fast</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Results Section */}
                  <ScrollArea className="h-[500px] pr-4">
                    {searchResults.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.map((result, index) => (
                          <Link key={result.id} to={`/note/${result.id}`}>
                            <div className="group p-6 border border-border/60 rounded-xl hover:bg-muted/30 hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-md">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                  {result.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                                    Score: {result.relevance.toFixed(1)}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    #{index + 1}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                                {result.snippet}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="text-center py-20">
                        <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-6">
                          <Search className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No results found</h3>
                        <p className="text-muted-foreground">
                          No matches for "<span className="font-medium">{searchQuery}</span>"
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Try different keywords or check spelling
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-fit mx-auto mb-6">
                          <Sparkles className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-3">Start your research</h3>
                        <p className="text-muted-foreground text-lg mb-2">
                          Search through your notes and transcripts with AI-powered precision
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-6">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Smart ranking
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            Fast caching
                          </Badge>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                // Enhanced Chat Mode
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
                  
                  {/* Enhanced Chat Input */}
                  <div className="flex gap-3 p-2 bg-muted/30 rounded-xl border border-border/50">
                    <Input
                      placeholder="Ask about your notes..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base"
                    />
                    <Button
                      onClick={handleChatSubmit}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
