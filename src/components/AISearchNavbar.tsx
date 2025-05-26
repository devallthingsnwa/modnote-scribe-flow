
import { useState, useRef, useEffect } from "react";
import { Search, Bot, X, Send, Loader2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotes } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
}

export function AISearchNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const searchNotes = (query: string) => {
    if (!notes || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = notes
      .map(note => {
        const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
        const contentMatch = note.content?.toLowerCase().includes(query.toLowerCase()) || false;
        
        if (!titleMatch && !contentMatch) return null;

        // Calculate relevance score
        let relevance = 0;
        if (titleMatch) relevance += 2;
        if (contentMatch) relevance += 1;

        // Create snippet
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
      .slice(0, 5) as SearchResult[];

    setSearchResults(results);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchNotes(query);
  };

  const handleChatSubmit = async () => {
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

    try {
      // Get relevant notes for RAG
      const relevantNotes = notes?.filter(note => 
        note.content && (
          note.title.toLowerCase().includes(chatInput.toLowerCase()) ||
          note.content.toLowerCase().includes(chatInput.toLowerCase())
        )
      ).slice(0, 3) || [];

      // Prepare knowledge base for RAG
      const knowledgeBase = relevantNotes.map(note => 
        `Title: ${note.title}\nContent: ${note.content?.substring(0, 1000)}...`
      ).join('\n\n---\n\n');

      const ragContext = knowledgeBase ? 
        `Based on the following knowledge from the user's notes:\n\n${knowledgeBase}\n\nUser question: ${chatInput}` : 
        chatInput;

      // Call DeepSeek API
      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ragContext,
          type: 'chat',
          options: { rag: true }
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.processedContent || "I'm sorry, I couldn't process your request.",
        timestamp: new Date(),
        sources: relevantNotes.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          relevance: 1,
          snippet: note.content?.substring(0, 100) + '...' || ''
        }))
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 md:relative md:top-0 md:right-0 shadow-lg"
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden md:inline">AI Search</span>
      </Button>

      {/* Search Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="flex justify-center pt-20 px-4">
            <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={!isChatMode ? "default" : "outline"}
                      size="sm"
                      onClick={toggleMode}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Search
                    </Button>
                    <Button
                      variant={isChatMode ? "default" : "outline"}
                      size="sm"
                      onClick={toggleMode}
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      AI Chat
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {!isChatMode ? (
                  <>
                    {/* Search Mode */}
                    <div className="p-4">
                      <Input
                        ref={inputRef}
                        placeholder="Search your notes with AI..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <ScrollArea className="flex-1 px-4 pb-4">
                      {searchResults.length > 0 ? (
                        <div className="space-y-3">
                          {searchResults.map((result) => (
                            <Card key={result.id} className="p-3 hover:bg-muted/50 cursor-pointer">
                              <h3 className="font-medium text-sm mb-1">{result.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {result.snippet}
                              </p>
                              <Badge variant="secondary" className="mt-2 text-xs">
                                Relevance: {result.relevance}
                              </Badge>
                            </Card>
                          ))}
                        </div>
                      ) : searchQuery ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No notes found for "{searchQuery}"
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Start typing to search your notes...
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <>
                    {/* Chat Mode */}
                    <ScrollArea className="flex-1 p-4">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Ask me anything about your notes!</p>
                          <p className="text-xs mt-1">I can help you find information, summarize content, and answer questions.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex",
                                message.type === 'user' ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                                  message.type === 'user'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                {message.sources && message.sources.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                                    <p className="text-xs opacity-70 mb-1">Sources:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {message.sources.map((source) => (
                                        <Badge key={source.id} variant="secondary" className="text-xs">
                                          {source.title}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-lg px-3 py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* Chat Input */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ask about your notes..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleChatSubmit}
                          disabled={!chatInput.trim() || isLoading}
                          size="icon"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
