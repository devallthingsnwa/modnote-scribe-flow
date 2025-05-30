
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SearchMode } from "./SearchMode";
import { ChatMode } from "./ChatMode";

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

interface AIResearchContentProps {
  isChatMode: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  chatMessages: ChatMessage[];
  chatInput: string;
  isLoading: boolean;
  onSearch: (query: string) => void;
  onChatInputChange: (value: string) => void;
  onChatSubmit: () => void;
}

export function AIResearchContent({
  isChatMode,
  searchQuery,
  searchResults,
  chatMessages,
  chatInput,
  isLoading,
  onSearch,
  onChatInputChange,
  onChatSubmit
}: AIResearchContentProps) {
  return (
    <div className="flex-1 px-2 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <Card className="w-full shadow-lg border-border/40 bg-card/90 backdrop-blur-sm min-h-[calc(100vh-200px)]">
          <CardContent className="p-3 sm:p-4 lg:p-6 h-full">
            {!isChatMode ? (
              <SearchMode
                searchQuery={searchQuery}
                searchResults={searchResults}
                onSearch={onSearch}
              />
            ) : (
              <ChatMode
                chatMessages={chatMessages}
                chatInput={chatInput}
                isLoading={isLoading}
                onChatInputChange={onChatInputChange}
                onChatSubmit={onChatSubmit}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
