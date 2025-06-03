
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Youtube, Mic, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionService } from "@/lib/transcriptionService";
import { useCreateModNote } from "@/lib/modNoteApi";

interface TranscriptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TranscriptUploadModal({ isOpen, onClose, onSuccess }: TranscriptUploadModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<string>("");
  const { toast } = useToast();
  const createNoteMutation = useCreateModNote();

  const handleYouTubeTranscript = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingType("YouTube");

    try {
      const result = await TranscriptionService.transcribeWithFallback(youtubeUrl);
      
      if (result.success && result.text) {
        // Create a new note with the transcript
        await createNoteMutation.mutateAsync({
          title: result.metadata?.title || "YouTube Transcript",
          content: result.text,
          source_url: youtubeUrl,
          is_transcription: true,
        });

        toast({
          title: "YouTube Transcript Extracted",
          description: "Successfully created note from YouTube video",
        });

        onSuccess?.();
        onClose();
        setYoutubeUrl("");
      } else {
        throw new Error("Failed to extract transcript");
      }
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract YouTube transcript",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingType("");
    }
  };

  const handleVoiceRecording = () => {
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon!",
    });
  };

  const handlePDFUpload = () => {
    toast({
      title: "PDF Processing",
      description: "PDF text extraction feature coming soon!",
    });
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      setYoutubeUrl("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            Extract Content
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* YouTube Transcript */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" />
              YouTube Video Transcript
            </h3>
            <div className="space-y-2">
              <Input
                placeholder="Enter YouTube URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isProcessing}
              />
              <Button
                onClick={handleYouTubeTranscript}
                disabled={isProcessing || !youtubeUrl.trim()}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                {isProcessing && processingType === "YouTube" ? (
                  "Extracting..."
                ) : (
                  "Extract Transcript"
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Voice Recording */}
          <div className="space-y-2">
            <Button
              onClick={handleVoiceRecording}
              variant="outline"
              className="w-full flex items-center gap-2"
              disabled={isProcessing}
            >
              <Mic className="w-4 h-4 text-green-500" />
              Voice Recording
            </Button>
          </div>

          {/* PDF Upload */}
          <div className="space-y-2">
            <Button
              onClick={handlePDFUpload}
              variant="outline"
              className="w-full flex items-center gap-2"
              disabled={isProcessing}
            >
              <FileText className="w-4 h-4 text-orange-500" />
              PDF Text Extraction
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isProcessing}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
