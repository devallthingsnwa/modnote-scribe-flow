
import React, { useState, useCallback, useMemo } from "react";
import { useNotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedSearchService } from "@/lib/aiResearch/searchService";
import { EnhancedSearchService } from "@/lib/aiResearch/enhancedSearchService";
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
  contextFingerprint?: string;
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

  // Enhanced search with hybrid functionality
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!notes || !query.trim() || query.trim().length < 2) {
          setSearchResults([]);
          return;
        }
        
        console.log(`🔍 HYBRID SEARCH INITIATED: "${query}" across ${notes.length} notes`);
        const searchStart = performance.now();
        
        try {
          const results = await EnhancedSearchService.hybridSearch(notes, query);
          const searchTime = performance.now() - searchStart;
          
          console.log(`⚡ HYBRID SEARCH COMPLETED: ${searchTime.toFixed(1)}ms, ${results.length} results`);
          console.log('Search breakdown:', results.reduce((acc, r) => {
            acc[r.searchType] = (acc[r.searchType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>));
          
          setSearchResults(results);
        } catch (error) {
          console.error('🚨 Hybrid search error:', error);
          // Fallback to basic search if hybrid fails
          const fallbackResults = OptimizedSearchService.searchNotes(notes, query);
          setSearchResults(fallbackResults);
        }
      }, 150);
    };
  }, [notes]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");
    setIsLoading(true);

    // Add streaming message placeholder
    const streamingMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      type: 'assistant',
      content: "",
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, streamingMessage]);

    try {
      const startTime = performance.now();
      
      console.log(`🧠 ENHANCED CONTEXT PROCESSING: Starting RAG pipeline for "${currentInput}"`);
      
      // Use hybrid search to find the most relevant context
      const searchResults = await EnhancedSearchService.hybridSearch(notes || [], currentInput);
      
      if (searchResults.length === 0) {
        console.log('❌ NO RELEVANT SOURCES FOUND WITH HYBRID SEARCH');
        setChatMessages(prev => prev.filter(m => !m.isStreaming));
        
        const noContextMessage: ChatMessage = {
          id: `no_context_${Date.now()}`,
          type: 'assistant',
          content: `I couldn't find any relevant content for your query: "${currentInput}". This could mean your notes don't contain information about this topic, or you might want to try different keywords. The search used both keyword matching and semantic understanding to find relevant content.`,
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }

      // Create enhanced context with vector search results
      const contextSources = searchResults.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content || '',
        relevance: result.relevance,
        searchType: result.searchType,
        similarity: result.similarity,
        metadata: result.metadata
      }));

      const strictContext = `SYSTEM INSTRUCTIONS: 
You are answering based EXCLUSIVELY on the provided context sources found through advanced semantic search. DO NOT use any external knowledge.

SEARCH METHOD: Hybrid (Keyword + Vector Embeddings)
SOURCES_FOUND: ${contextSources.length}
SEARCH_TYPES: ${contextSources.map(s => s.searchType).join(', ')}

ENHANCED CONTEXT WITH SEARCH SCORES:
${contextSources.map((source, index) => `
**SOURCE ${index + 1}: ${source.title}**
UNIQUE_ID: ${source.id}
SEARCH_TYPE: ${source.searchType}
RELEVANCE_SCORE: ${source.relevance.toFixed(3)}
${source.similarity ? `SEMANTIC_SIMILARITY: ${source.similarity.toFixed(3)}` : ''}
TYPE: ${source.metadata?.is_transcription ? 'VIDEO_TRANSCRIPT' : 'TEXT_NOTE'}

CONTENT:
${source.content}

---NEXT_SOURCE---
`).join('\n')}

USER QUERY: "${currentInput}"

CRITICAL INSTRUCTIONS:
1. Answer ONLY using information from the verified sources above
2. ALWAYS cite specific source titles when referencing information
3. Reference the search type used to find each source (keyword, semantic, or hybrid)
4. If sources contain conflicting information, acknowledge it and cite each source
5. Leverage the high semantic similarity scores to find the most relevant information
6. If the query cannot be fully answered from these sources, say so explicitly

RESPONSE FORMAT: Reference sources like: "According to [Source Title] (found via semantic search)..." or "Based on keyword matching in '[Title]'..."`;

      console.log(`📊 ENHANCED RAG STATS: ${contextSources.length} sources via hybrid search`);
      console.log('Search breakdown:', contextSources.reduce((acc, s) => {
        acc[s.searchType] = (acc[s.searchType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: strictContext,
          type: 'chat',
          options: { 
            rag: true, 
            strict_context: true,
            max_tokens: 2000,
            temperature: 0.1,
            hybrid_search: true
          }
        }
      });

      if (error) {
        console.error('🚨 AI API ERROR:', error);
        throw error;
      }

      const responseTime = performance.now() - startTime;
      
      // Remove streaming message and add final response
      setChatMessages(prev => prev.filter(m => !m.isStreaming));

      const assistantMessage: ChatMessage = {
        id: `response_${Date.now()}`,
        type: 'assistant',
        content: data.processedContent || "I couldn't generate a response based on the available context. Please try rephrasing your question.",
        timestamp: new Date(),
        sources: contextSources.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `${source.searchType.toUpperCase()} | Score: ${source.relevance.toFixed(3)}${source.similarity ? ` | Similarity: ${source.similarity.toFixed(3)}` : ''}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      console.log(`✅ ENHANCED RAG RESPONSE: ${responseTime.toFixed(0)}ms using hybrid search with ${contextSources.length} sources`);

      // Enhanced success notification
      toast({
        title: "Enhanced AI Response",
        description: `Generated using hybrid search (${contextSources.length} sources) in ${responseTime.toFixed(0)}ms`,
      });

    } catch (error: any) {
      console.error('🚨 ENHANCED RAG ERROR:', error);
      
      setChatMessages(prev => prev.filter(m => !m.isStreaming));
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: "I encountered an error while processing your request with the enhanced RAG system. Please try again or rephrase your question.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Enhanced RAG Error",
        description: "Failed to generate response using hybrid search. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = useCallback(() => {
    const newMode = !isChatMode;
    setIsChatMode(newMode);
    
    if (newMode) {
      // Switching to chat mode
      setSearchResults([]);
      setSearchQuery("");
      console.log('🔄 SWITCHED TO ENHANCED CHAT MODE: AI responses with hybrid search (keyword + semantic)');
    } else {
      // Switching to search mode
      setChatMessages([]);
      console.log('🔄 SWITCHED TO HYBRID SEARCH MODE: Keyword + semantic search across all notes');
    }
    
    // Clear caches for fresh start
    EnhancedSearchService.clearCache();
  }, [isChatMode]);

  // Performance cleanup
  React.useEffect(() => {
    return () => {
      EnhancedSearchService.clearCache();
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
