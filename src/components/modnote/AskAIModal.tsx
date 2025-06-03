
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAIResponse: (response: string) => void;
  context?: string;
}

export function AskAIModal({ isOpen, onClose, onAIResponse, context }: AskAIModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskAI = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      // This would integrate with your AI service (OpenAI, DeepSeek, etc.)
      // For now, we'll simulate an AI response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse = `Here's an AI-generated response to: "${prompt}"\n\nBased on ${context ? 'the current content' : 'your request'}, here are some suggestions:\n\n• Key insight 1\n• Key insight 2\n• Key insight 3\n\nWould you like me to elaborate on any of these points?`;
      
      onAIResponse(mockResponse);
      toast({
        title: "AI Response Generated",
        description: "The AI response has been added to your note.",
      });
      onClose();
      setPrompt("");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-500" />
            Ask AI
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {context && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                AI will use your current note content as context.
              </p>
            </div>
          )}
          
          <Textarea
            placeholder="What would you like to know or generate?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAskAI} 
              disabled={!prompt.trim() || isLoading}
              className="bg-green-500 hover:bg-green-600"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Ask AI
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
