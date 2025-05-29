
import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AIResearchHeader } from "./AIResearchHeader";
import { AIResearchContent } from "./AIResearchContent";
import { useNotes } from "@/lib/api";

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

export function AIResearchPage() {
  const [isChatMode, setIsChatMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: notes } = useNotes();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!notes || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = notes
      .map(note => {
        const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
        const contentMatch = note.content?.toLowerCase().includes(query.toLowerCase()) || false;
        
        if (!titleMatch && !contentMatch) return null;

        let relevance = 0;
        if (titleMatch) relevance += 2;
        if (contentMatch) relevance += 1;

        let snippet = '';
        if (note.content) {
          const queryIndex = note.content.toLowerCase().indexOf(query.toLowerCase());
          if (queryIndex !== -1) {
            const start = Math.max(0, queryIndex - 50);
            const end = Math.min(note.content.length, queryIndex + query.length + 50);
            snippet = '...' + note.content.substring(start, end) + '...';
          } else {
            snippet = note.content.substring(0, 100) + '...';
          }
        }

        return {
          id: note.id,
          title: note.title,
          content: note.content,
          relevance,
          snippet
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.relevance - a!.relevance)
      .slice(0, 10) as SearchResult[];

    setSearchResults(results);
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);

    // Simulate AI response for now
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I understand you're asking about: "${chatInput}". I'll help you find relevant information from your notes.`,
        timestamp: new Date(),
        sources: searchResults.slice(0, 3)
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const toggleMode = () => {
    setIsChatMode(!isChatMode);
    if (!isChatMode) {
      setSearchResults([]);
      setSearchQuery("");
    } else {
      setChatMessages([]);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
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
          onChatInputChange={handleChatInputChange}
          onChatSubmit={handleChatSubmit}
        />
      </div>
    </div>
  );
}
