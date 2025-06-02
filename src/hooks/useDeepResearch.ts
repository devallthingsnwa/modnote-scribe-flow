
import { useState, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { SemanticSearchEngine } from "@/lib/vectorSearch/semanticSearchEngine";

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
    return async (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!notes || !query.trim()) {
          setSearchResults([]);
          return;
        }
        
        const searchStart = performance.now();
        const results = await SemanticSearchEngine.searchNotes(notes, query);
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
      
      // Use semantic search for better context
      const contextResults = await SemanticSearchEngine.searchNotes(notes || [], currentInput);
      const contextTime = performance.now() - contextStart;
      
      if (contextResults.length === 0) {
        const noContextMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I couldn't find semantically similar content in your notes for this query. Try using different keywords or adding more relevant content.",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }
      
      const knowledgeBase = contextResults.map(result => 
        `${result.title}\n${result.snippet}\nSimilarity: ${result.relevance.toFixed(3)}`
      ).join('\n\n---\n\n');
      
      const ragContext = `Context (${knowledgeBase.length} chars from ${contextResults.length} semantically similar sources):\n\n${knowledgeBase}\n\nQ: ${currentInput}`;

      console.log(`⚡ Semantic context: ${contextTime.toFixed(1)}ms | ${knowledgeBase.length} chars | ${contextResults.length} sources`);

      const apiStart = performance.now();
      const { data, error } = await supabase.functions.invoke('process-content-with-mistral', {
        body: {
          content: ragContext,
          type: 'chat',
          options: { rag: true, semantic_search: true },
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
        tokenCount: data.usage?.total_tokens || knowledgeBase.length,
        sources: contextResults.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Similarity: ${source.relevance.toFixed(3)}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setMetrics(responseMetrics);

      console.log(`🚀 Semantic response: ${totalTime.toFixed(0)}ms`);

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Request cancelled by user');
        return;
      }
      
      console.error('Semantic chat error:', error);
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
    toast({
      title: "Chat Cleared",
      description: "Conversation history cleared.",
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
