
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, AlertCircle, Copy, ThumbsUp, ThumbsDown, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize with a welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "🎯 **Welcome to your AI Learning Assistant!**\n\nI'm powered by DeepSeek and equipped with advanced RAG capabilities. I can help you:\n\n• **Analyze** and summarize your content\n• **Answer questions** about the material\n• **Create study guides** and flashcards\n• **Explain complex concepts** in simple terms\n• **Generate insights** and connections\n• **Practice questions** for better understanding\n\nWhat would you like to explore today?",
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

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

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: "Thinking...",
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Prepare enhanced context with the note content and chat history for RAG
      const conversationHistory = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
      
      const ragContext = `
KNOWLEDGE BASE (Note Content):
${content}

CONVERSATION HISTORY:
${conversationHistory}

USER QUESTION: ${inputMessage.trim()}

Instructions: You are an expert learning assistant. Using the knowledge base above as your primary source of truth, provide a comprehensive and educational response. Follow these guidelines:

1. **Retrieve** relevant information from the knowledge base
2. **Augment** your response with context from conversation history
3. **Generate** clear, well-structured answers with examples when helpful
4. **Reference** specific parts of the content when relevant
5. **Provide** additional insights to enhance understanding
6. Use **formatting** like headers, bullet points, and emphasis for clarity
7. If information isn't in the knowledge base, clearly state this
8. Be encouraging and educational in your tone
9. Suggest follow-up questions when appropriate

Focus on being helpful, accurate, and educational.
`;

      const { data, error } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: {
          content: ragContext,
          type: "chat",
          options: {
            conversational: true,
            helpful: true,
            educational: true,
            rag: true,
            temperature: 0.7,
            max_tokens: 1500
          }
        }
      });

      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== 'typing'));

      if (error) {
        throw new Error(error.message);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.processedContent || "I apologize, but I couldn't process your request properly. Could you please try rephrasing your question?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setHasApiError(true);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "⚠️ I'm experiencing connection issues with the DeepSeek API. Please ensure your API key is properly configured and try again. If the problem persists, check your network connection.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Connection Error",
        description: "Unable to connect to DeepSeek API. Please check your configuration.",
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
      content: "🔄 **Chat cleared!** \n\nI'm ready to help you analyze your content again. What would you like to know?",
      timestamp: new Date()
    }]);
    setHasApiError(false);
  };

  const regenerateResponse = () => {
    if (messages.length < 2) return;
    
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the last assistant response
      setMessages(prev => {
        const lastUserIndex = prev.map(m => m.id).lastIndexOf(lastUserMessage.id);
        return prev.slice(0, lastUserIndex + 1);
      });
      
      // Resend the last user message
      setInputMessage(lastUserMessage.content);
      setTimeout(() => sendMessage(), 100);
    }
  };

  const quickActions = [
    { label: "Summarize key points", action: "Please provide a comprehensive summary of the key points from this content." },
    { label: "Create study guide", action: "Create a detailed study guide with main topics, subtopics, and important details." },
    { label: "Generate questions", action: "Generate 5-10 practice questions based on this content to test understanding." },
    { label: "Explain concepts", action: "Identify and explain the most important concepts covered in this material." },
    { label: "Find connections", action: "Help me identify key relationships and connections between different ideas in this content." },
    { label: "Practice quiz", action: "Create a short quiz with multiple choice questions to test my knowledge." }
  ];

  return (
    <div className="flex flex-col h-full max-h-[75vh] space-y-4">
      {/* Enhanced Header */}
      <div className="space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Learning Assistant
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Powered by DeepSeek RAG
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={regenerateResponse}
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearChat}
              className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
        
        {/* Enhanced Status Indicators */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <Badge 
            variant={content ? "default" : "secondary"} 
            className={content ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200" : ""}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {content ? `RAG Ready (${Math.floor(content.length / 100)}k chars)` : "No Content"}
          </Badge>
          
          {hasApiError && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertCircle className="h-3 w-3 mr-1" />
              API Error
            </Badge>
          )}
          
          {messages.length > 1 && (
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
              {messages.filter(m => !m.isTyping).length - 1} messages
            </Badge>
          )}
          
          <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border-purple-200">
            DeepSeek AI
          </Badge>
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && content && !hasApiError && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 dark:from-blue-900/20 dark:to-purple-900/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Quick Actions - Click to get started:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 justify-start bg-white/50 hover:bg-white/80 border-blue-200 hover:border-blue-300 text-blue-800 hover:text-blue-900 transition-all"
                    onClick={() => setInputMessage(action.action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Error Warning */}
        {hasApiError && (
          <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200">DeepSeek API Configuration Issue</p>
                  <p className="text-red-700 dark:text-red-300 mt-1">
                    The API connection failed. Please verify your DeepSeek API key is properly configured in the project settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Enhanced Chat Messages */}
      <Card className="flex-1 flex flex-col border-border/50 shadow-lg min-h-0 bg-gradient-to-b from-background to-muted/5">
        <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            RAG Conversation
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
            <div className="space-y-6 py-4">
              {messages.filter(m => !m.isTyping).map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`p-2 rounded-full flex-shrink-0 shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-r from-purple-500 to-purple-600'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  
                  <div className={`flex-1 space-y-2 min-w-0 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block max-w-[85%] p-4 rounded-xl break-words shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto'
                        : 'bg-white dark:bg-muted border border-border/50 text-foreground'
                    }`}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Message Actions */}
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs hover:bg-muted/50"
                            onClick={() => copyToClipboard(message.content)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs hover:bg-green-50 hover:text-green-700"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs hover:bg-red-50 hover:text-red-700"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground px-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Enhanced Typing Indicator */}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-white dark:bg-muted border border-border/50 text-foreground p-4 rounded-xl shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">AI is thinking...</span>
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
      
      {/* Enhanced Message Input */}
      <Card className="border-border/50 flex-shrink-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardContent className="p-4">
          <div className="flex space-x-3">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your content..."
              disabled={isLoading}
              className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            />
            <Button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Enter</kbd> to send
            <span>•</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Shift + Enter</kbd> for new line
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Powered by DeepSeek RAG
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
