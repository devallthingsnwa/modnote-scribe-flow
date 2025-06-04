import { useState, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { HybridSearchStrategy } from "@/lib/vectorSearch/searchStrategies/hybridSearch";
import { SemanticSearchStrategy } from "@/lib/vectorSearch/searchStrategies/semanticSearch";
import { KeywordSearchStrategy } from "@/lib/vectorSearch/searchStrategies/keywordSearch";
import { SearchCache } from "@/lib/vectorSearch/searchCache";
import { EnhancedSearchResult, SearchOptions } from "@/lib/vectorSearch/types";

interface EnhancedChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: EnhancedSearchResult[];
  responseTime?: number;
  tokenCount?: number;
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

// Enhanced context cache with quality scoring
const enhancedContextCache = new Map<string, { 
  results: EnhancedSearchResult[]; 
  timestamp: number; 
  quality: number;
  strategy: string;
}>();
const ENHANCED_CACHE_DURATION = 90000; // 90 seconds for better context

export function useEnhancedSemanticChat() {
  const [chatMessages, setChatMessages] = useState<EnhancedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [metrics, setMetrics] = useState<EnhancedPerformanceMetrics | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [searchStrategy, setSearchStrategy] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

  // Enhanced processed notes with metadata
  const processedNotes = useMemo(() => {
    if (!notes) return [];
    return notes.map(note => ({
      ...note,
      searchableContent: `${note.title} ${note.content || ''}`.toLowerCase(),
      contentQuality: calculateContentQuality(note),
      lastAccessed: null
    }));
  }, [notes]);

  const calculateContentQuality = useCallback((note: any) => {
    let quality = 0.5; // Base quality
    
    if (note.content) {
      // Length factor
      if (note.content.length > 1000) quality += 0.2;
      else if (note.content.length > 500) quality += 0.1;
      
      // Structure indicators
      if (note.content.includes('\n\n')) quality += 0.1; // Paragraphs
      if (note.content.match(/#{1,6}\s/g)) quality += 0.1; // Headers
      if (note.content.includes('```')) quality += 0.05; // Code blocks
    }
    
    // Recency bonus
    if (note.created_at) {
      const daysSinceCreation = (Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) quality += 0.1;
    }
    
    return Math.min(quality, 1.0);
  }, []);

  const getEnhancedCachedContext = useCallback((query: string) => {
    const cacheKey = `${query.toLowerCase().trim()}_${searchStrategy}`;
    const cached = enhancedContextCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ENHANCED_CACHE_DURATION) {
      console.log(`🚀 Enhanced context cache hit (${cached.strategy}, quality: ${cached.quality.toFixed(2)})`);
      return cached;
    }
    
    return null;
  }, [searchStrategy]);

  const setEnhancedCachedContext = useCallback((query: string, results: EnhancedSearchResult[], strategy: string) => {
    const cacheKey = `${query.toLowerCase().trim()}_${searchStrategy}`;
    const quality = calculateContextQuality(results);
    
    enhancedContextCache.set(cacheKey, { 
      results, 
      timestamp: Date.now(), 
      quality,
      strategy 
    });
    
    // Enhanced cache management
    if (enhancedContextCache.size > 25) {
      const sortedEntries = Array.from(enhancedContextCache.entries())
        .sort((a, b) => b[1].quality - a[1].quality || b[1].timestamp - a[1].timestamp);
      
      // Keep top quality entries
      enhancedContextCache.clear();
      sortedEntries.slice(0, 20).forEach(([key, value]) => {
        enhancedContextCache.set(key, value);
      });
    }
  }, [searchStrategy]);

  const calculateContextQuality = useCallback((results: EnhancedSearchResult[]) => {
    if (results.length === 0) return 0;
    
    const avgRelevance = results.reduce((sum, r) => sum + r.relevance, 0) / results.length;
    const diversityScore = new Set(results.map(r => r.sourceType)).size / 2; // Max diversity = 1
    const contentRichness = results.filter(r => r.metadata?.contentLength && r.metadata.contentLength > 500).length / results.length;
    
    return (avgRelevance * 0.5 + diversityScore * 0.3 + contentRichness * 0.2);
  }, []);

  const executeSearch = useCallback(async (query: string, searchOptions: SearchOptions): Promise<EnhancedSearchResult[]> => {
    if (searchOptions.hybridMode) {
      return await HybridSearchStrategy.execute(processedNotes, query);
    } else if (searchOptions.useSemanticSearch) {
      return await SemanticSearchStrategy.execute(processedNotes, query);
    } else {
      return await KeywordSearchStrategy.execute(processedNotes, query);
    }
  }, [processedNotes]);

  const handleEnhancedChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = performance.now();
    let cacheHit = false;
    
    const userMessage: EnhancedChatMessage = {
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
      
      // Try enhanced cache first
      let cachedContext = getEnhancedCachedContext(currentInput);
      let contextResults: EnhancedSearchResult[] = [];
      let usedStrategy = searchStrategy;
      
      if (cachedContext) {
        contextResults = cachedContext.results;
        usedStrategy = cachedContext.strategy as any;
        cacheHit = true;
      } else {
        // Use enhanced search with selected strategy
        const searchOptions = {
          useSemanticSearch: searchStrategy === 'semantic' || searchStrategy === 'hybrid',
          useKeywordSearch: searchStrategy === 'keyword' || searchStrategy === 'hybrid',
          hybridMode: searchStrategy === 'hybrid',
          contextOptimization: true
        };
        
        contextResults = await executeSearch(currentInput, searchOptions);
        
        // Cache the results
        setEnhancedCachedContext(currentInput, contextResults, searchStrategy);
      }
      
      const contextTime = performance.now() - contextStart;
      
      if (contextResults.length === 0) {
        const noContextMessage: EnhancedChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I couldn't find relevant content in your knowledge base for this query. Try using different keywords, adding more content, or switching search strategies.",
          timestamp: new Date(),
          searchStrategy: usedStrategy
        };
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }
      
      // Enhanced context preparation with quality optimization
      const topResults = contextResults.slice(0, 5);
      const contextQuality = calculateContextQuality(topResults);
      
      // Adaptive context size based on quality
      const contextLimit = contextQuality > 0.7 ? 2500 : contextQuality > 0.5 ? 2000 : 1500;
      
      const optimizedContext = buildOptimizedContext(topResults, currentInput, contextLimit);
      
      // Enhanced RAG prompt with context quality indicators
      const ragPrompt = `Context Quality: ${(contextQuality * 100).toFixed(1)}%
Search Strategy: ${usedStrategy}
Relevant Sources: ${topResults.length}

KNOWLEDGE BASE:
${optimizedContext}

USER QUESTION: ${currentInput}

Please provide a comprehensive answer based on the knowledge base above. Include:
1. Direct answers from the sources
2. Connections between different pieces of information
3. Key insights and implications
4. Suggest follow-up questions if relevant

Answer:`;

      console.log(`⚡ Enhanced RAG context: ${contextTime.toFixed(1)}ms | Quality: ${(contextQuality * 100).toFixed(1)}% | Strategy: ${usedStrategy} | Sources: ${topResults.length}`);

      const apiStart = performance.now();
      
      // Enhanced API call with better parameters
      const { data, error } = await supabase.functions.invoke('process-content-with-mistral', {
        body: {
          content: ragPrompt,
          type: 'enhanced_chat',
          options: { 
            rag: true, 
            enhanced_context: true,
            context_quality: contextQuality,
            search_strategy: usedStrategy,
            temperature: 0.6,
            max_tokens: 2000
          },
          stream: false
        }
      });

      if (controller.signal.aborted) return;

      const apiTime = performance.now() - apiStart;
      const totalTime = performance.now() - startTime;

      if (error) throw error;

      const responseMetrics: EnhancedPerformanceMetrics = {
        searchTime: cacheHit ? 0 : contextTime,
        contextTime,
        apiTime,
        totalTime,
        cacheHitRate: cacheHit ? 1 : 0,
        searchStrategy: usedStrategy,
        contextQuality
      };

      const assistantMessage: EnhancedChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.processedContent || "I couldn't process your request properly. Please try rephrasing your question.",
        timestamp: new Date(),
        responseTime: totalTime,
        tokenCount: optimizedContext.length,
        contextQuality,
        searchStrategy: usedStrategy,
        sources: topResults.slice(0, 4).map(source => ({
          ...source,
          snippet: `${source.metadata?.searchMethod || 'unknown'} search • ${source.relevance.toFixed(3)} relevance`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setMetrics(responseMetrics);

      console.log(`🚀 Enhanced RAG complete: ${totalTime.toFixed(0)}ms (${cacheHit ? 'cached' : 'live'})`);

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Enhanced RAG request cancelled');
        return;
      }
      
      console.error('Enhanced RAG error:', error);
      toast({
        title: "Enhanced AI Error",
        description: "Failed to get enhanced AI response. Please try again or switch search strategies.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  }, [chatInput, isLoading, processedNotes, searchStrategy, toast, getEnhancedCachedContext, setEnhancedCachedContext, calculateContextQuality, executeSearch]);

  const buildOptimizedContext = useCallback((results: EnhancedSearchResult[], query: string, limit: number) => {
    let context = '';
    let currentLength = 0;
    
    // Prioritize results by relevance and content quality
    const prioritizedResults = results.sort((a, b) => {
      const aScore = a.relevance + (a.metadata?.topicRelevance || 0) * 0.3;
      const bScore = b.relevance + (b.metadata?.topicRelevance || 0) * 0.3;
      return bScore - aScore;
    });
    
    for (const result of prioritizedResults) {
      const sourceInfo = `[${result.sourceType.toUpperCase()}] ${result.title}`;
      const content = result.snippet || result.content?.substring(0, 300) || 'No content';
      const entry = `${sourceInfo}:\n${content}\n\n`;
      
      if (currentLength + entry.length > limit) {
        // Try to fit a shorter version
        const shorterContent = content.substring(0, Math.max(100, limit - currentLength - sourceInfo.length - 10));
        const shorterEntry = `${sourceInfo}:\n${shorterContent}...\n\n`;
        
        if (currentLength + shorterEntry.length <= limit) {
          context += shorterEntry;
        }
        break;
      }
      
      context += entry;
      currentLength += entry.length;
    }
    
    return context;
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingContent("");
      toast({
        title: "Request Cancelled",
        description: "The enhanced AI request was cancelled.",
      });
    }
  }, [toast]);

  const clearEnhancedChat = useCallback(() => {
    setChatMessages([]);
    setMetrics(null);
    enhancedContextCache.clear();
    SearchCache.clear();
    toast({
      title: "Enhanced Chat Cleared",
      description: "Conversation history and all caches cleared.",
    });
  }, [toast]);

  const switchSearchStrategy = useCallback((newStrategy: 'hybrid' | 'semantic' | 'keyword') => {
    setSearchStrategy(newStrategy);
    toast({
      title: "Search Strategy Updated",
      description: `Switched to ${newStrategy} search mode for better results.`,
    });
  }, [toast]);

  return {
    chatMessages,
    isLoading,
    chatInput,
    setChatInput,
    metrics,
    streamingContent,
    searchStrategy,
    handleChatSubmit: handleEnhancedChatSubmit,
    cancelRequest,
    clearChat: clearEnhancedChat,
    switchSearchStrategy,
    cacheStats: {
      contextCache: enhancedContextCache.size,
      searchCache: SearchCache.getStats().size
    },
    abortControllerRef
  };
}
