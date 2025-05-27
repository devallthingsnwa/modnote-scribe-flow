
import { useState, useRef, useEffect } from "react";
import { Search, Bot, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

export function DeepResearchWidget() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { data: notes } = useNotes();

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
      const relevantNotes = notes?.filter(note => 
        note.content && (
          note.title.toLowerCase().includes(chatInput.toLowerCase()) ||
          note.content.toLowerCase().includes(chatInput.toLowerCase())
        )
      ).slice(0, 3) || [];

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
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 py-1 h-auto">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="text-sm">AI Research</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-2 mt-2">
        <Card className="shadow-sm">
          <CardHeader className="p-3 pb-2">
            <div className="flex gap-1">
              <Button
                variant={!isChatMode ? "default" : "outline"}
                size="sm"
                onClick={toggleMode}
                className="flex-1 h-7 text-xs"
              >
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
              <Button
                variant={isChatMode ? "default" : "outline"}
                size="sm"
                onClick={toggleMode}
                className="flex-1 h-7 text-xs"
              >
                <Bot className="h-3 w-3 mr-1" />
                Chat
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-3 pt-0">
            {!isChatMode ? (
              <>
                <Input
                  ref={inputRef}
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full text-xs h-8 mb-2"
                />
                
                <ScrollArea className="h-32">
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div key={result.id} className="p-2 border rounded text-xs hover:bg-muted/50 cursor-pointer">
                          <h4 className="font-medium truncate mb-1">{result.title}</h4>
                          <p className="text-muted-foreground text-xs line-clamp-2">
                            {result.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      No results found
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      Search your notes and transcripts
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <>
                <ScrollArea className="h-32 mb-2">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p>Ask me about your notes!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
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
                              "max-w-[85%] rounded-lg px-2 py-1 text-xs",
                              message.type === 'user'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-muted-foreground/20">
                                <div className="flex flex-wrap gap-1">
                                  {message.sources.map((source) => (
                                    <Badge key={source.id} variant="secondary" className="text-xs h-4 px-1">
                                      {source.title.substring(0, 15)}...
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
                          <div className="bg-muted rounded-lg px-2 py-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                <div className="flex gap-1">
                  <Input
                    placeholder="Ask about your notes..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    className="flex-1 text-xs h-7"
                  />
                  <Button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || isLoading}
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
