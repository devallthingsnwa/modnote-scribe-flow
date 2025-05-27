
import { useState } from "react";
import { ArrowLeft, Bot, Search, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export default function AIResearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const { toast } = useToast();
  const { data: notes } = useNotes();

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
            snippet = note.content.substring(0, 200) + '...';
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
      const relevantNotes = notes?.filter(note => 
        note.content && (
          note.title.toLowerCase().includes(chatInput.toLowerCase()) ||
          note.content.toLowerCase().includes(chatInput.toLowerCase())
        )
      ).slice(0, 5) || [];

      const knowledgeBase = relevantNotes.map(note => 
        `Title: ${note.title}\nContent: ${note.content?.substring(0, 1000)}...`
      ).join('\n\n---\n\n');

      const ragContext = knowledgeBase ? 
        `Based on the following knowledge from the user's notes:\n\n${knowledgeBase}\n\nUser question: ${chatInput}` : 
        chatInput;

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
          snippet: note.content?.substring(0, 150) + '...' || ''
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">AI Research</h1>
                <p className="text-muted-foreground">Search and chat with your notes using AI</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={!isChatMode ? "default" : "outline"}
                onClick={toggleMode}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
              <Button
                variant={isChatMode ? "default" : "outline"}
                onClick={toggleMode}
                className="flex items-center gap-2"
              >
                <Bot className="h-4 w-4" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            {!isChatMode ? (
              // Search Mode
              <div className="space-y-6">
                <div>
                  <Input
                    placeholder="Search across all your notes and transcripts..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="text-lg p-6"
                  />
                </div>
                
                <ScrollArea className="h-96">
                  {searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map((result) => (
                        <Link key={result.id} to={`/note/${result.id}`}>
                          <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <h3 className="font-semibold mb-2">{result.title}</h3>
                            <p className="text-muted-foreground text-sm line-clamp-3">
                              {result.snippet}
                            </p>
                            <Badge variant="secondary" className="mt-2">
                              Relevance: {result.relevance}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No results found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start typing to search your notes and transcripts</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              // Chat Mode
              <div className="space-y-6">
                <ScrollArea className="h-96 mb-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Ask me anything about your notes!</p>
                      <p className="text-sm mt-2">I can help you find information, summarize content, and answer questions.</p>
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
                              "max-w-[80%] rounded-lg px-4 py-3",
                              message.type === 'user'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                                <p className="text-xs font-medium mb-2">Sources:</p>
                                <div className="flex flex-wrap gap-2">
                                  {message.sources.map((source) => (
                                    <Link key={source.id} to={`/note/${source.id}`}>
                                      <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                                        {source.title.substring(0, 20)}...
                                      </Badge>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
                
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
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
