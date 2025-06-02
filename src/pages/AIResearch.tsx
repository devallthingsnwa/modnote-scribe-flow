
import React, { useState, useCallback, useMemo, useRef } from "react";
import { useNotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SemanticSearchEngine } from "@/lib/vectorSearch/semanticSearchEngine";
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

  // Enhanced semantic search with vector embeddings
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!notes || !query.trim() || query.trim().length < 2) {
          setSearchResults([]);
          return;
        }
        
        console.log(`🧠 SEMANTIC SEARCH: "${query}" across ${notes.length} notes using vector embeddings`);
        const searchStart = performance.now();
        
        // Use semantic search with Pinecone
        const results = await SemanticSearchEngine.searchNotes(notes, query);
        const searchTime = performance.now() - searchStart;
        
        console.log(`⚡ SEMANTIC SEARCH COMPLETED: ${searchTime.toFixed(1)}ms, ${results.length} relevant results`);
        setSearchResults(results);
      }, 100);
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
      
      console.log(`🧠 SEMANTIC RAG PROCESSING: Starting for query "${currentInput}"`);
      
      // Enhanced semantic search for context
      const contextResults = await SemanticSearchEngine.searchNotes(notes || [], currentInput);
      
      if (contextResults.length === 0) {
        console.log('❌ NO SEMANTIC MATCHES FOUND');
        setChatMessages(prev => prev.filter(m => !m.isStreaming));
        
        const noContextMessage: ChatMessage = {
          id: `no_context_${Date.now()}`,
          type: 'assistant',
          content: `🔍 SEMANTIC SEARCH: No content in your notes meets the similarity threshold for: "${currentInput}"\n\nThe AI couldn't find semantically similar content. Try:\n• More specific terms or phrases\n• Different keywords that might be in your content\n• Adding more relevant notes to improve future searches`,
          timestamp: new Date()
        };
        
        setChatMessages(prev => [...prev, noContextMessage]);
        setIsLoading(false);
        return;
      }

      // Create enhanced context with semantic similarity scores
      const contextContent = contextResults.map(result => 
        `Title: ${result.title}\nContent: ${result.snippet}\nSimilarity: ${result.relevance.toFixed(3)}\nSource: ${result.sourceType}`
      ).join('\n\n---\n\n');

      const enhancedContext = `SEMANTIC CONTEXT FROM USER'S NOTES (Vector Search):
${contextContent}

USER QUERY: "${currentInput}"

Please provide a comprehensive response based on the semantically similar content above. Reference specific information and similarity scores when relevant.`;

      console.log(`📊 SEMANTIC CONTEXT: ${contextContent.length} chars from ${contextResults.length} sources`);

      const { data, error } = await supabase.functions.invoke('process-content-with-mistral', {
        body: {
          content: enhancedContext,
          type: 'chat',
          options: { 
            rag: true, 
            semantic_search: true,
            max_tokens: 2500,
            temperature: 0.1
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
        content: data.processedContent || "I couldn't generate a response based on your notes.",
        timestamp: new Date(),
        sources: contextResults.slice(0, 3).map(source => ({
          id: source.id,
          title: source.title,
          content: null,
          relevance: source.relevance,
          snippet: `Similarity: ${source.relevance.toFixed(3)} | Source: ${source.sourceType}`
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      console.log(`✅ SEMANTIC RAG RESPONSE: ${responseTime.toFixed(0)}ms using ${contextResults.length} semantically similar sources`);

      toast({
        title: "Semantic Search Complete",
        description: `Found ${contextResults.length} semantically similar sources in ${responseTime.toFixed(0)}ms`,
      });

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Request cancelled by user');
        return;
      }
      
      console.error('🚨 SEMANTIC CHAT ERROR:', error);
      
      setChatMessages(prev => prev.filter(m => !m.isStreaming));
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: "Processing error occurred. Please try rephrasing your question.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Processing Error",
        description: "Failed to generate response. Please try again.",
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
      console.log('🔄 SWITCHED TO SEMANTIC CHAT MODE: AI-powered conversations with vector search');
    } else {
      // Switching to search mode
      setChatMessages([]);
      console.log('🔄 SWITCHED TO SEMANTIC SEARCH MODE: Vector-based similarity search');
    }
  }, [isChatMode]);

  // Enhanced cleanup
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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
