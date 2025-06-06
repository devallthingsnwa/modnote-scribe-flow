
import { useState, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/lib/api";
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

export function useDeepResearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

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
        
        setSearchResults(results.slice(0, 6));
        setMetrics(prev => ({ ...prev, searchTime } as PerformanceMetrics));
      }, 150);
    };
  }, [notes]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isLoading) return;

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
      const contextStart = performance.now();
      const contextData = ContextProcessor.processNotesForContext(notes || [], currentInput);
      const contextTime = performance.now() - contextStart;
      
      const knowledgeBase = contextData.relevantChunks.join('\n\n---\n\n');
      
      const ragContext = knowledgeBase ? 
        `Context (${contextData.totalTokens} chars from ${contextData.sources.length} sources):\n\n${knowledgeBase}\n\nQ: ${currentInput}` : 
        currentInput;

      console.log(`⚡ Ultra-fast context: ${contextTime.toFixed(1)}ms | ${contextData.totalTokens} chars | ${contextData.sources.length} sources`);

      const apiStart = performance.now();
      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ragContext,
          type: 'chat',
          options: { rag: true },
          stream: false
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

  return {
    searchQuery,
    searchResults,
    chatMessages,
    isLoading,
    isChatMode,
    chatInput,
    setChatInput,
    metrics,
    streamingContent,
    handleSearch,
    handleChatSubmit,
    cancelRequest,
    toggleMode,
    clearChat,
    abortControllerRef
  };
}
