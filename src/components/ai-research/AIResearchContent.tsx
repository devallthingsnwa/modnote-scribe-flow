
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
    <div className="flex-1 px-6 py-8 overflow-auto">
      <Card className="max-w-5xl mx-auto shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8">
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
  );
}
