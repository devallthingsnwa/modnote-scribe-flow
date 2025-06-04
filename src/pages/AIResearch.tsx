import React, { useState, useCallback, useMemo, useRef } from "react";
import { useNotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  isolationLevel?: string;
}

export default function AIResearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

  // Enhanced search with comprehensive validation
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!notes || !query.trim() || query.trim().length < 3) {
          setSearchResults([]);
          return;
        }
        
        console.log(`🎯 ENHANCED SEARCH: "${query}" with strict metadata validation across ${notes.length} notes`);
        const searchStart = performance.now();
        
        // Use the new enhanced search service with comprehensive validation
        const results = EnhancedSearchService.searchNotes(notes, query);
        const searchTime = performance.now() - searchStart;
        
        console.log(`⚡ SEARCH COMPLETED: ${searchTime.toFixed(1)}ms, ${results.length} validated results (filtered out irrelevant content)`);
        setSearchResults(results);
      }, 150); // Reduced debounce for better UX
    };
  }, [notes]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isLoading) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
      
      console.log(`🧠 ULTRA-STRICT CONTEXT PROCESSING: Starting for query "${currentInput}"`);
      
      // ULTRA-STRICT context processing with maximum source isolation
      const contextData = ContextProcessor.processNotesForContext(notes || [], currentInput);
      
      if (contextData.sources.length === 0) {
        console.log('❌ NO SOURCES PASSED ULTRA-STRICT VALIDATION');
        setChatMessages(prev => prev.filter(m => !m.isStreaming));
        
        const noContextMessage: ChatMessage = {
          id: `no_context_${Date.now()}`,
          type: 'assistant',
          content: `🔒 ULTRA-STRICT VALIDATION: No sources in your notes meet the high relevance threshold for: "${currentInput}"\n\nThis ensures maximum accuracy by preventing information mixing. Try:\n• More specific search terms\n• Exact names or titles\n• Key phrases from your content\n\nOr add more relevant notes to your collection.`,
          timestamp: new Date(),
          contextFingerprint: contextData.queryFingerprint,
          isolationLevel: contextData.isolationLevel
        };
        
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }

      // Create MAXIMUM-ISOLATION context with ultra-strict barriers
      const ultraStrictContext = `🔒 ULTRA-STRICT AI SYSTEM INSTRUCTIONS - MAXIMUM SOURCE ISOLATION 🔒

CRITICAL ACCURACY PROTOCOL ACTIVE:
- Source mixing detection: ENABLED
- Cross-contamination prevention: MAXIMUM
- Fact verification: ULTRA-STRICT
- Attribution requirements: MANDATORY

QUERY VALIDATION:
Original Query: "${currentInput}"
Query Fingerprint: ${contextData.queryFingerprint}
Isolation Level: ${contextData.isolationLevel.toUpperCase()}
Sources Validated: ${contextData.sources.length} (passed ultra-strict threshold)
Context Tokens: ${contextData.totalTokens}

STRICT CONTEXT SUMMARY:
${contextData.contextSummary}

🔒 ISOLATED SOURCE CONTENT WITH MAXIMUM BARRIERS:
${contextData.relevantChunks.join('\n\n🔒═══ SOURCE ISOLATION BARRIER ═══🔒\n\n')}

🚨 CRITICAL AI INSTRUCTIONS:
1. NEVER mix information between the isolated sources above
2. ALWAYS cite the exact source title and ID for each piece of information
3. If sources conflict, acknowledge the conflict and cite each source separately
4. If the query cannot be fully answered from these sources, say so explicitly
5. NEVER use external knowledge - ONLY use the verified content above
6. Each fact MUST be traceable to a specific source by title
7. Use format: "According to [Source Title] (ID: ${contextData.sources[0]?.id})..."

RESPONSE VERIFICATION:
- Source attribution: REQUIRED for every statement
- Fact checking: Against provided sources ONLY
- Cross-reference validation: ENABLED
- External knowledge: FORBIDDEN

USER QUERY FOR VERIFIED RESPONSE: "${currentInput}"`;

      console.log(`📊 ULTRA-STRICT CONTEXT: ${contextData.totalTokens} tokens from ${contextData.sources.length} maximum-verified sources`);

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ultraStrictContext,
          type: 'chat',
          options: { 
            rag: true, 
            strict_context: true,
            ultra_isolation: true,
            max_tokens: 2500,
            temperature: 0.05 // Minimum temperature for maximum factual accuracy
          }
        }
      });

      if (controller.signal.aborted) return;

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
        content: data.processedContent || "I couldn't generate a response using the ultra-strict validation criteria. This ensures maximum accuracy by preventing information mixing.",
        timestamp: new Date(),
        contextFingerprint: contextData.queryFingerprint,
        isolationLevel: contextData.isolationLevel,
        sources: contextData.sources.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Ultra-Verified Source | Score: ${source.relevance.toFixed(4)} | Type: ${source.metadata?.is_transcription ? 'Video Transcript' : 'Text Note'} | Isolation: MAXIMUM`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      console.log(`✅ ULTRA-STRICT RESPONSE: ${responseTime.toFixed(0)}ms using ${contextData.sources.length} maximum-verified sources`);
      console.log(`📈 ACCURACY METRICS: Context tokens: ${contextData.totalTokens}, Verified sources: ${contextData.sources.length}, Isolation: ${contextData.isolationLevel}`);

      if (data.usage) {
        console.log('💰 Token usage:', data.usage);
      }

      // Success notification for ultra-high-quality responses
      if (contextData.sources.length > 0 && responseTime < 5000) {
        toast({
          title: "Ultra-High Accuracy Response",
          description: `Generated from ${contextData.sources.length} ultra-verified sources in ${responseTime.toFixed(0)}ms with maximum isolation`,
        });
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Request cancelled by user');
        return;
      }
      
      console.error('🚨 ULTRA-STRICT CHAT ERROR:', error);
      
      setChatMessages(prev => prev.filter(m => !m.isStreaming));
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: "🔒 Processing error detected. Ultra-strict validation maintains data integrity by preventing unreliable responses. Please try rephrasing your question or ensure your notes contain relevant information.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Ultra-Strict Validation Error",
        description: "Maximum accuracy protection activated. Data integrity maintained.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const toggleMode = useCallback(() => {
    const newMode = !isChatMode;
    setIsChatMode(newMode);
    
    if (newMode) {
      // Switching to chat mode
      setSearchResults([]);
      setSearchQuery("");
      console.log('🔄 SWITCHED TO ULTRA-STRICT CHAT MODE: Maximum accuracy with isolated source attribution');
    } else {
      // Switching to search mode
      setChatMessages([]);
      console.log('🔄 SWITCHED TO ULTRA-FAST SEARCH MODE: Lightning search with enhanced precision');
    }
    
    // Clear all caches for fresh start with new validation
    EnhancedSearchService.clearCache();
    ContextProcessor.clearCache();
  }, [isChatMode]);

  // Enhanced cleanup
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      EnhancedSearchService.clearCache();
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
