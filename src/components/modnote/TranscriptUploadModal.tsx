
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateModNote } from "@/lib/modNoteApi";

interface TranscriptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TranscriptUploadModal({ isOpen, onClose, onSuccess }: TranscriptUploadModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const createNoteMutation = useCreateModNote();

  const handleYouTubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate transcript extraction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const extractedTitle = "YouTube Video Transcript";
      const extractedContent = `Transcript from: ${youtubeUrl}\n\n[Transcript content would be extracted here]`;
      
      await createNoteMutation.mutateAsync({
        title: extractedTitle,
        content: extractedContent,
        source_url: youtubeUrl,
        is_transcription: true,
        thumbnail: null,
      });

      toast({
        title: "Transcript Extracted",
        description: "YouTube transcript has been saved as a new note.",
      });

      setYoutubeUrl("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("YouTube transcript error:", error);
      toast({
        title: "Error",
        description: "Failed to extract transcript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioUpload = async () => {
    if (!audioFile) {
      toast({
        title: "File Required",
        description: "Please select an audio file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate audio transcript processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const extractedTitle = `Audio Transcript - ${audioFile.name}`;
      const extractedContent = `Transcript from audio file: ${audioFile.name}\n\n[Audio transcript content would be processed here]`;
      
      await createNoteMutation.mutateAsync({
        title: extractedTitle,
        content: extractedContent,
        is_transcription: true,
        thumbnail: null,
      });

      toast({
        title: "Audio Processed",
        description: "Audio transcript has been saved as a new note.",
      });

      setAudioFile(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Audio processing error:", error);
      toast({
        title: "Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!transcriptText.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter transcript content",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNoteMutation.mutateAsync({
        title: "Manual Transcript",
        content: transcriptText,
        is_transcription: true,
        thumbnail: null,
      });

      toast({
        title: "Transcript Saved",
        description: "Manual transcript has been saved as a new note.",
      });

      setTranscriptText("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Manual transcript error:", error);
      toast({
        title: "Error",
        description: "Failed to save transcript. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            Extract Transcript
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Manual
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="youtube" className="space-y-4">
            <div>
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <Button 
              onClick={handleYouTubeSubmit} 
              disabled={!youtubeUrl.trim() || isProcessing}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : null}
              {isProcessing ? "Extracting..." : "Extract Transcript"}
            </Button>
          </TabsContent>
          
          <TabsContent value="audio" className="space-y-4">
            <div>
              <Label htmlFor="audio-file">Audio File</Label>
              <Input
                id="audio-file"
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              {audioFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {audioFile.name}
                </p>
              )}
            </div>
            <Button 
              onClick={handleAudioUpload} 
              disabled={!audioFile || isProcessing}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : null}
              {isProcessing ? "Processing..." : "Process Audio"}
            </Button>
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <div>
              <Label htmlFor="transcript-text">Transcript Content</Label>
              <Textarea
                id="transcript-text"
                placeholder="Paste or type your transcript content here..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                className="min-h-[120px]"
                disabled={isProcessing}
              />
            </div>
            <Button 
              onClick={handleManualSubmit} 
              disabled={!transcriptText.trim() || isProcessing}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              Save Transcript
            </Button>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
