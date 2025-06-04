
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MistralOcrService } from '@/lib/mistralOcrService';

interface MistralProcessingButtonProps {
  extractedText: string;
  fileName: string;
  fileType: string;
  onProcessed: (processedContent: string) => void;
  disabled?: boolean;
}

export function MistralProcessingButton({
  extractedText,
  fileName,
  fileType,
  onProcessed,
  disabled
}: MistralProcessingButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleMistralProcessing = async () => {
    if (!MistralOcrService.shouldProcessWithMistral(extractedText)) {
      toast({
        title: "Processing not recommended",
        description: "Text is too short or too long for optimal AI processing",
        variant: "default",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await MistralOcrService.processExtractedText(
        extractedText,
        fileName,
        fileType
      );

      if (result.success) {
        onProcessed(result.processedContent);
        toast({
          title: "🤖 AI Processing Complete!",
          description: "Document has been enhanced and structured by Mistral AI",
        });
      } else {
        throw new Error(result.error || 'Processing failed');
      }

    } catch (error) {
      console.error("Mistral processing error:", error);
      toast({
        title: "AI Processing failed",
        description: error.message || "Failed to process document with Mistral AI",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!MistralOcrService.shouldProcessWithMistral(extractedText)) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">AI Enhancement Available</h4>
              <p className="text-sm text-blue-700">
                Use Mistral AI to clean, structure, and extract key data
              </p>
            </div>
          </div>
          <Button
            onClick={handleMistralProcessing}
            disabled={disabled || isProcessing}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enhance with AI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
