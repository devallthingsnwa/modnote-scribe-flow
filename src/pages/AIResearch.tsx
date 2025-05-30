
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

  // Enhanced search with validation
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!notes || !query.trim() || query.trim().length < 2) {
          setSearchResults([]);
          return;
        }
        
        const searchStart = performance.now();
        const results = OptimizedSearchService.searchNotes(notes, query);
        const searchTime = performance.now() - searchStart;
        
        console.log(`🔍 Search completed in ${searchTime.toFixed(1)}ms for query: "${query}"`);
        setSearchResults(results);
      }, 200); // Reduced debounce for better responsiveness
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

    // Add streaming message placeholder
    const streamingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: "",
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, streamingMessage]);

    try {
      const startTime = performance.now();
      
      // Enhanced context processing with validation
      const contextData = ContextProcessor.processNotesForContext(notes || [], currentInput);
      
      if (contextData.sources.length === 0) {
        // No relevant sources found
        setChatMessages(prev => prev.filter(m => !m.isStreaming));
        
        const noContextMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: `I couldn't find any relevant notes for your query: "${currentInput}". Please try a different search term or add some notes first.`,
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }

      // Create enhanced context with strict source attribution
      const enhancedContext = `SYSTEM: You are answering based ONLY on the provided context. Do not use external knowledge.

CONTEXT SOURCES (${contextData.sources.length} relevant notes found):
${contextData.contextSummary}

CONTENT:
${contextData.relevantChunks.join('\n\n---NEXT SOURCE---\n\n')}

USER QUERY: ${currentInput}

INSTRUCTIONS: Answer based STRICTLY on the provided context. Reference specific source titles when mentioning information. If the query cannot be answered from the provided context, say so clearly.`;

      console.log(`🧠 Enhanced RAG context: ${enhancedContext.length} chars from ${contextData.sources.length} sources`);

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: enhancedContext,
          type: 'chat',
          options: { rag: true, strict_context: true }
        }
      });

      if (error) throw error;

      const responseTime = performance.now() - startTime;
      
      // Remove streaming message and add final response
      setChatMessages(prev => prev.filter(m => !m.isStreaming));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        type: 'assistant',
        content: data.processedContent || "I couldn't process your request based on the available context.",
        timestamp: new Date(),
        sources: contextData.sources.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Relevance: ${source.relevance.toFixed(2)} | ${source.metadata?.is_transcription ? 'Video Transcript' : 'Note'}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      console.log(`✅ Response generated in ${responseTime.toFixed(0)}ms using ${contextData.sources.length} sources`);

      if (data.usage) {
        console.log('💰 Token usage:', data.usage);
      }

    } catch (error: any) {
      console.error('🚨 Chat error:', error);
      
      setChatMessages(prev => prev.filter(m => !m.isStreaming));
      
      toast({
        title: "Error",
        description: "Failed to get AI response. Please check your connection and try again.",
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
    
    // Clear caches when switching modes
    OptimizedSearchService.clearCache();
    ContextProcessor.clearCache();
  }, [isChatMode]);

  // Clear cache when component unmounts
  React.useEffect(() => {
    return () => {
      OptimizedSearchService.clearCache();
      ContextProcessor.clearCache();
    };
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
