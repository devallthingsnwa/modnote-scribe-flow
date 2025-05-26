
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  noteId: string;
  content: string;
}

export function AIChatPanel({ noteId, content }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiError, setHasApiError] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with a welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm your AI learning assistant powered by DeepSeek. I can help you understand this video content better using advanced RAG (Retrieval-Augmented Generation) techniques. I can answer questions about the concepts discussed, create study guides, explain complex topics, and provide insights based on the transcript. What would you like to know about this content?",
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setHasApiError(false);

    try {
      // Prepare context with the note content and chat history for RAG
      const conversationHistory = messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
      
      const ragContext = `
KNOWLEDGE BASE (Video/Note Content):
${content}

CONVERSATION HISTORY:
${conversationHistory}

USER QUESTION: ${inputMessage.trim()}

Instructions: Using the knowledge base above as your primary source of truth, answer the user's question. If the answer isn't in the knowledge base, clearly state that the information isn't available in the provided content. Use RAG principles to:
1. Retrieve relevant information from the knowledge base
2. Augment your response with context from the conversation history
3. Generate a comprehensive answer that references specific parts of the content when relevant
4. Provide additional insights and explanations to enhance understanding
`;

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ragContext,
          type: "chat",
          options: {
            conversational: true,
            helpful: true,
            educational: true,
            rag: true
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.processedContent || "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setHasApiError(true);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. It looks like there's an issue with the DeepSeek API configuration. Please check if your DeepSeek API key is properly configured in the project settings.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "API Configuration Error",
        description: "The DeepSeek API key appears to be invalid or not configured. Please check your project settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: "Chat cleared! How can I help you understand this content better using RAG analysis?",
      timestamp: new Date()
    }]);
    setHasApiError(false);
  };

  const suggestedQuestions = [
    "Summarize the key points",
    "Explain the main concepts",
    "What are the practical applications?",
    "Create a study guide",
    "What are the most important takeaways?",
    "Can you elaborate on [specific topic]?"
  ];

  return (
    <div className="flex flex-col h-full max-h-[70vh] space-y-4">
      {/* Header */}
      <div className="space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Learning Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Powered by DeepSeek with RAG capabilities
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearChat}
            className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
          >
            Clear Chat
          </Button>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center space-x-3 flex-wrap">
          <Badge 
            variant={content ? "default" : "secondary"} 
            className={content ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {content ? "RAG Ready" : "No Content"}
          </Badge>
          
          {hasApiError && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              API Error
            </Badge>
          )}
          
          {messages.length > 1 && (
            <Badge variant="outline" className="text-xs">
              {messages.length - 1} messages
            </Badge>
          )}
          
          <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            DeepSeek AI
          </Badge>
        </div>

        {/* API Error Warning */}
        {hasApiError && (
          <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200">DeepSeek API Configuration Issue</p>
                  <p className="text-red-700 dark:text-red-300 mt-1">
                    The API key appears to be invalid. Please check your project settings and ensure the DeepSeek API key is properly configured.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Questions */}
        {messages.length === 1 && content && !hasApiError && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 justify-start"
                    onClick={() => setInputMessage(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col border-border/50 shadow-lg min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            RAG Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'bg-purple-100 dark:bg-purple-900'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  
                  <div className={`flex-1 space-y-1 min-w-0 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block max-w-[80%] p-3 rounded-lg break-words ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white ml-auto'
                        : 'bg-muted text-foreground'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-muted text-foreground p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing with RAG...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Message Input */}
      <Card className="border-border/50 flex-shrink-0">
        <CardContent className="p-4">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about this content..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Shift + Enter for new line • Powered by DeepSeek RAG
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
