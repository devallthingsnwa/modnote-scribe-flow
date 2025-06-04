
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

// Context cache to avoid redundant searches
const contextCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

export function useSemanticChat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

  // Memoize processed notes for faster searches
  const processedNotes = useMemo(() => {
    if (!notes) return [];
    return notes.map(note => ({
      ...note,
      searchableContent: `${note.title} ${note.content || ''}`.toLowerCase()
    }));
  }, [notes]);

  const getCachedContext = useCallback((query: string) => {
    const cacheKey = query.toLowerCase().trim();
    const cached = contextCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🚀 Using cached context for faster response');
      return cached.results;
    }
    
    return null;
  }, []);

  const setCachedContext = useCallback((query: string, results: SearchResult[]) => {
    const cacheKey = query.toLowerCase().trim();
    contextCache.set(cacheKey, { results, timestamp: Date.now() });
    
    // Clean old cache entries
    if (contextCache.size > 50) {
      const oldestKey = contextCache.keys().next().value;
      contextCache.delete(oldestKey);
    }
  }, []);

  const handleChatSubmit = useCallback(async () => {
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
      
      // Try cache first for instant response
      let contextResults = getCachedContext(currentInput);
      
      if (!contextResults) {
        // Use parallel processing for better performance
        const searchPromises = [
          SemanticSearchEngine.searchNotes(processedNotes, currentInput),
          // Could add additional search strategies here
        ];
        
        const [semanticResults] = await Promise.all(searchPromises);
        contextResults = semanticResults;
        
        // Cache for future use
        setCachedContext(currentInput, contextResults);
      }
      
      const contextTime = performance.now() - contextStart;
      
      if (contextResults.length === 0) {
        const noContextMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I couldn't find relevant content in your notes for this query. Try using different keywords or adding more relevant content.",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }
      
      // Optimize context size for faster API calls
      const topResults = contextResults.slice(0, 4); // Limit to top 4 results
      const optimizedContext = topResults.map(result => 
        `${result.title}: ${result.snippet.substring(0, 200)}`
      ).join('\n\n');
      
      // More concise prompt for faster processing
      const ragContext = `Context:\n${optimizedContext}\n\nQ: ${currentInput}`;

      console.log(`⚡ Optimized context: ${contextTime.toFixed(1)}ms | ${optimizedContext.length} chars | ${topResults.length} sources`);

      const apiStart = performance.now();
      
      // Use optimized API call with reduced token limits for speed
      const { data, error } = await supabase.functions.invoke('process-content-with-mistral', {
        body: {
          content: ragContext,
          type: 'chat',
          options: { 
            rag: true, 
            semantic_search: true,
            fast_mode: true // Flag for faster processing
          },
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
        tokenCount: optimizedContext.length,
        sources: topResults.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Similarity: ${source.relevance.toFixed(3)}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setMetrics(responseMetrics);

      console.log(`🚀 FAST RAG response: ${totalTime.toFixed(0)}ms`);

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Request cancelled by user');
        return;
      }
      
      console.error('Fast RAG error:', error);
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
  }, [chatInput, isLoading, processedNotes, toast, getCachedContext, setCachedContext]);

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

  const clearChat = useCallback(() => {
    setChatMessages([]);
    setMetrics(null);
    // Clear cache when clearing chat
    contextCache.clear();
    toast({
      title: "Chat Cleared",
      description: "Conversation history and cache cleared.",
    });
  }, [toast]);

  return {
    chatMessages,
    isLoading,
    chatInput,
    setChatInput,
    metrics,
    streamingContent,
    handleChatSubmit,
    cancelRequest,
    clearChat,
    abortControllerRef
  };
}
