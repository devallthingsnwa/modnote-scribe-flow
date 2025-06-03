
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAIResponse: (response: string) => void;
  context?: string;
}

export function AskAIModal({ isOpen, onClose, onAIResponse, context }: AskAIModalProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      // Simulate AI response for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = `AI Response: Based on your question "${question}", here are some suggestions...`;
      onAIResponse(response);
      
      toast({
        title: "AI Response Generated",
        description: "The AI has provided suggestions for your question.",
      });
      
      onClose();
      setQuestion("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-500" />
            Ask AI Assistant
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              What would you like help with?
            </label>
            <Textarea
              placeholder="Ask me anything about your notes, writing, or need help with content generation..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>
          
          {context && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Current note context:
              </label>
              <p className="text-sm text-gray-700 line-clamp-3">
                {context.substring(0, 150)}...
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!question.trim() || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
