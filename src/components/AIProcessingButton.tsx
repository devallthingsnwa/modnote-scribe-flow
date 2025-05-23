
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIProcessingButtonProps {
  noteId: string;
  content: string | null;
  onContentUpdated: (newContent: string) => void;
}

export function AIProcessingButton({ noteId, content, onContentUpdated }: AIProcessingButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAIProcess = async () => {
    if (!content || content.trim().length < 50) {
      toast({
        title: "Insufficient content",
        description: "The note needs more content to process with AI.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Call the DeepSeek processing function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-content-with-deepseek', {
        body: { 
          content: content, 
          type: "text",
          options: {
            summary: true,
            highlights: true,
            keyPoints: true
          }
        }
      });

      if (aiError) {
        throw aiError;
      }

      if (aiData?.processedContent) {
        // Combine the AI analysis with the original content
        const enhancedContent = `${aiData.processedContent}\n\n---\n\n## Original Content\n\n${content}`;
        
        // Update the note content
        onContentUpdated(enhancedContent);
        
        toast({
          title: "AI Analysis Complete",
          description: "Your content has been enhanced with AI-generated insights.",
        });
      } else {
        throw new Error("No processed content received from AI");
      }
    } catch (error: any) {
      console.error("Error processing with AI:", error);
      toast({
        title: "AI Processing Failed",
        description: error.message || "Failed to process content with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if the content already contains AI analysis
  const hasAIAnalysis = content?.includes("## Summary") || 
                       content?.includes("## Key Highlights") || 
                       content?.includes("## Key Points");

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleAIProcess}
        disabled={isProcessing || !content || content.trim().length < 50}
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-none hover:from-purple-600 hover:to-blue-600"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Analysis
          </>
        )}
      </Button>
      
      {hasAIAnalysis && (
        <Badge variant="secondary" className="text-xs">
          AI Enhanced
        </Badge>
      )}
    </div>
  );
}
