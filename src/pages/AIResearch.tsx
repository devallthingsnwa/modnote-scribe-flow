
import React, { useState, useCallback, useMemo } from "react";
import { useNotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedSearchService } from "@/lib/aiResearch/searchService";
import { ContextProcessor } from "@/lib/aiResearch/contextProcessor";
import { Sidebar } from "@/components/Sidebar";
import { AIResearchHeader } from "@/components/ai-research/AIResearchHeader";
import { AIResearchContent } from "@/components/ai-research/AIResearchContent";

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
      }, 300);
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

    const streamingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: "",
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, streamingMessage]);

    try {
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
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        <AIResearchHeader
          isChatMode={isChatMode}
          searchResults={searchResults}
          chatMessages={chatMessages}
          onToggleMode={toggleMode}
        />

        <AIResearchContent
          isChatMode={isChatMode}
          searchQuery={searchQuery}
          searchResults={searchResults}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isLoading={isLoading}
          onSearch={handleSearch}
          onChatInputChange={setChatInput}
          onChatSubmit={handleChatSubmit}
        />
      </div>
    </div>
  );
}
