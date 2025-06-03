
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Copy, RefreshCw } from "lucide-react";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const quickActions = [
    "Summarize this text",
    "Improve writing",
    "Generate ideas",
    "Fix grammar",
    "Make it shorter",
    "Explain concepts"
  ];

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    // Simulate AI response
    setTimeout(() => {
      setResponse("Here's an AI-generated response based on your prompt. This would be connected to your preferred AI service like OpenAI, Claude, or local models.");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Assistant
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Quick Actions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Badge
                  key={action}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setPrompt(action)}
                >
                  {action}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Input */}
          <div>
            <Textarea
              placeholder="Ask AI to help with writing, summarizing, generating ideas, or improving your content..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>
          
          {/* Response */}
          {response && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">AI Response</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">{response}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!prompt.trim() || isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
