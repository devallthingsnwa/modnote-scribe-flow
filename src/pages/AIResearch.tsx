
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

  // Enhanced search with strict validation
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!notes || !query.trim() || query.trim().length < 2) {
          setSearchResults([]);
          return;
        }
        
        console.log(`🔍 SEARCH INITIATED: "${query}" across ${notes.length} notes`);
        const searchStart = performance.now();
        
        const results = OptimizedSearchService.searchNotes(notes, query);
        const searchTime = performance.now() - searchStart;
        
        console.log(`⚡ SEARCH COMPLETED: ${searchTime.toFixed(1)}ms, ${results.length} results`);
        setSearchResults(results);
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
      
      console.log(`🧠 CONTEXT PROCESSING: Starting for query "${currentInput}"`);
      
      // STRICT context processing with enhanced validation
      const contextData = ContextProcessor.processNotesForContext(notes || [], currentInput);
      
      if (contextData.sources.length === 0) {
        console.log('❌ NO RELEVANT SOURCES FOUND');
        setChatMessages(prev => prev.filter(m => !m.isStreaming));
        
        const noContextMessage: ChatMessage = {
          id: `no_context_${Date.now()}`,
          type: 'assistant',
          content: `I couldn't find any relevant notes for your query: "${currentInput}". This ensures I only provide information from your actual notes and don't mix sources. Please try different search terms or add relevant notes first.`,
          timestamp: new Date(),
          contextFingerprint: contextData.queryFingerprint
        };
        
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }

      // Create ULTRA-STRICT context with source isolation
      const strictContext = `SYSTEM INSTRUCTIONS: 
You are answering based EXCLUSIVELY on the provided context sources. DO NOT use any external knowledge or mix information between sources.

QUERY FINGERPRINT: ${contextData.queryFingerprint}
SOURCE VERIFICATION: ${contextData.sources.length} verified sources found
RELEVANCE THRESHOLD: Applied strict filtering (min 0.4)

CONTEXT SUMMARY:
${contextData.contextSummary}

VERIFIED CONTENT WITH SOURCE ATTRIBUTION:
${contextData.relevantChunks.join('\n\n===NEXT_VERIFIED_SOURCE===\n\n')}

USER QUERY: "${currentInput}"

CRITICAL INSTRUCTIONS:
1. Answer ONLY using information from the verified sources above
2. ALWAYS cite specific source titles when referencing information
3. If sources contain conflicting information, acknowledge the conflict and cite each source
4. If the query cannot be fully answered from these sources, say so explicitly
5. DO NOT combine information from different sources unless explicitly relevant
6. Each piece of information MUST be traceable to a specific source by title and ID

RESPONSE FORMAT: Reference sources like: "According to [Source Title]..." or "In the video transcript '[Title]'..."`;

      console.log(`📊 CONTEXT STATS: ${contextData.totalTokens} tokens from ${contextData.sources.length} verified sources`);

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: strictContext,
          type: 'chat',
          options: { 
            rag: true, 
            strict_context: true,
            max_tokens: 2000,
            temperature: 0.1 // Lower temperature for more factual responses
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
        contextFingerprint: contextData.queryFingerprint,
        sources: contextData.sources.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Verified Source | Relevance: ${source.relevance.toFixed(3)} | Type: ${source.metadata?.is_transcription ? 'Video Transcript' : 'Text Note'}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      console.log(`✅ RESPONSE GENERATED: ${responseTime.toFixed(0)}ms using ${contextData.sources.length} verified sources`);
      console.log(`📈 QUALITY METRICS: Context tokens: ${contextData.totalTokens}, Sources: ${contextData.sources.length}`);

      if (data.usage) {
        console.log('💰 Token usage:', data.usage);
      }

      // Success notification for high-quality responses
      if (contextData.sources.length > 0 && responseTime < 5000) {
        toast({
          title: "High-Quality Response",
          description: `Generated from ${contextData.sources.length} verified sources in ${responseTime.toFixed(0)}ms`,
        });
      }

    } catch (error: any) {
      console.error('🚨 CHAT ERROR:', error);
      
      setChatMessages(prev => prev.filter(m => !m.isStreaming));
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: "I encountered an error while processing your request. This helps ensure data integrity. Please try again or rephrase your question.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Processing Error",
        description: "Failed to generate response. Data integrity maintained.",
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
      console.log('🔄 SWITCHED TO CHAT MODE: Enhanced AI responses with strict source attribution');
    } else {
      // Switching to search mode
      setChatMessages([]);
      console.log('🔄 SWITCHED TO SEARCH MODE: Fast local search across all notes');
    }
    
    // Clear caches for fresh start
    OptimizedSearchService.clearCache();
    ContextProcessor.clearCache();
  }, [isChatMode]);

  // Performance cleanup
  React.useEffect(() => {
    return () => {
      OptimizedSearchService.clearCache();
      ContextProcessor.clearCache();
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
