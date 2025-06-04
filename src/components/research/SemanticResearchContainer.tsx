
import React, { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AIResearchHeader } from "@/components/ai-research/AIResearchHeader";
import { AIResearchContent } from "@/components/ai-research/AIResearchContent";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import { useSemanticChat } from "@/hooks/useSemanticChat";

export function SemanticResearchContainer() {
  const [isChatMode, setIsChatMode] = useState(false);
  
  const {
    searchQuery,
    searchResults,
    handleSearch
  } = useSemanticSearch();
  
  const {
    chatMessages,
    isLoading,
    chatInput,
    setChatInput,
    handleChatSubmit,
    clearChat
  } = useSemanticChat();

  const toggleMode = useCallback(() => {
    const newMode = !isChatMode;
    setIsChatMode(newMode);
    
    if (newMode) {
      console.log('🔄 SWITCHED TO SEMANTIC CHAT MODE: AI-powered conversations with vector search');
    } else {
      console.log('🔄 SWITCHED TO SEMANTIC SEARCH MODE: Vector-based similarity search');
    }
  }, [isChatMode]);

  return (
    <div className="flex h-screen bg-background">
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
