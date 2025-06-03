
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Youtube, Link, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { YouTubeService } from "@/lib/transcription/youtubeService";
import { useCreateModNote } from "@/lib/modNoteApi";

interface YouTubeTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function YouTubeTranscriptModal({ isOpen, onClose, onSuccess }: YouTubeTranscriptModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { toast } = useToast();
  const createNoteMutation = useCreateModNote();

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleExtractTranscript = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    
    try {
      console.log("Extracting transcript for:", youtubeUrl);
      
      const result = await YouTubeService.fetchYouTubeTranscript(youtubeUrl);
      
      if (result.success && result.text) {
        setExtractedData({
          title: result.metadata?.title || `YouTube Video ${videoId}`,
          content: result.text,
          metadata: result.metadata,
          videoId: videoId,
          url: youtubeUrl
        });
        
        toast({
          title: "✅ Transcript Extracted!",
          description: "YouTube transcript has been successfully extracted.",
        });
      } else {
        throw new Error(result.error || "Failed to extract transcript");
      }
    } catch (error) {
      console.error("Transcript extraction error:", error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract transcript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveNote = async () => {
    if (!extractedData) return;

    try {
      await createNoteMutation.mutateAsync({
        title: extractedData.title,
        content: extractedData.content,
        is_transcription: true,
        source_url: extractedData.url,
      });

      toast({
        title: "Note Saved",
        description: "YouTube transcript has been saved as a new note.",
      });

      onSuccess?.();
      onClose();
      setYoutubeUrl("");
      setExtractedData(null);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save the note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    onClose();
    setYoutubeUrl("");
    setExtractedData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            Extract YouTube Transcript
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!extractedData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="youtube-url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="pl-10"
                      disabled={isExtracting}
                    />
                  </div>
                  <Button 
                    onClick={handleExtractTranscript}
                    disabled={isExtracting || !youtubeUrl.trim()}
                    className="shrink-0"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Youtube className="w-4 h-4 mr-2" />
                        Extract
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-2">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
                  <li>https://youtu.be/VIDEO_ID</li>
                  <li>Videos with available captions/transcripts</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Transcript Extracted Successfully!</p>
                  <p className="text-sm text-green-600">Ready to save as a new note</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="text-sm text-gray-700 mt-1">{extractedData.title}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Video Info</Label>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {extractedData.metadata?.author && (
                      <p>Author: {extractedData.metadata.author}</p>
                    )}
                    {extractedData.metadata?.duration && (
                      <p>Duration: {extractedData.metadata.duration}</p>
                    )}
                    <p>Video ID: {extractedData.videoId}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Transcript Preview</Label>
                  <Textarea
                    value={extractedData.content.substring(0, 500) + (extractedData.content.length > 500 ? '...' : '')}
                    readOnly
                    className="mt-1 h-32 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {extractedData.content.length} characters extracted
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {extractedData && (
              <Button 
                onClick={handleSaveNote}
                disabled={createNoteMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createNoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Save Note
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
