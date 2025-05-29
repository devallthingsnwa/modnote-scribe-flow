
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionService } from "@/lib/transcriptionService";
import { UrlInput } from "./UrlInput";
import { SimplifiedPreviewSection } from "./SimplifiedPreviewSection";

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
}

export function EnhancedImportModal({ isOpen, onClose, onImport }: EnhancedImportModalProps) {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const { toast } = useToast();

  const resetState = () => {
    setUrl("");
    setMetadata(null);
    setTranscript(null);
    setContentType("");
    setProgress(0);
    setStatus("");
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL to import content.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setStatus("Analyzing URL...");

    try {
      // Detect content type
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        setContentType('youtube');
        setStatus("Processing YouTube video...");
        setProgress(30);

        const result = await TranscriptionService.transcribeWithFallback(url);
        setProgress(70);

        if (result.success && result.text) {
          setTranscript(result.text);
          setMetadata({
            title: `YouTube Video`,
            author: 'YouTube',
            duration: 'Unknown',
            thumbnail: `https://img.youtube.com/vi/${TranscriptionService.extractVideoId(url)}/maxresdefault.jpg`
          });
          setStatus("✅ Transcript extracted successfully!");
          setProgress(100);
        } else {
          throw new Error(result.error || 'Failed to extract transcript');
        }
      } else {
        // Handle other URL types (articles, podcasts, etc.)
        setContentType('article');
        setStatus("Processing article/content...");
        setProgress(50);
        
        // Placeholder for future article/podcast processing
        setMetadata({
          title: "Article Content",
          author: "Web Content",
          description: "Content extracted from provided URL"
        });
        setTranscript("Content extraction for articles and podcasts will be implemented in the next phase.");
        setStatus("Content preview ready");
        setProgress(100);
      }

    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process the provided URL.",
        variant: "destructive"
      });
      setProgress(0);
      setStatus("Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (!metadata || !transcript) {
      toast({
        title: "No Content",
        description: "Please process a URL first to import content.",
        variant: "destructive"
      });
      return;
    }

    const noteContent = contentType === 'youtube' ? 
      `# 🎥 ${metadata.title}\n\n**Source:** ${url}\n**Type:** Video Transcript\n**Imported:** ${new Date().toLocaleString()}\n\n---\n\n## 📝 Transcript\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...` :
      `# 📄 ${metadata.title}\n\n**Source:** ${url}\n**Type:** Article/Content\n**Imported:** ${new Date().toLocaleString()}\n\n---\n\n## 📝 Content\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;

    onImport({
      title: metadata.title,
      content: noteContent,
      source_url: url,
      thumbnail: metadata.thumbnail,
      is_transcription: contentType === 'youtube'
    });

    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Enhanced Content Import
            <Badge variant="secondary" className="text-xs">Focus: Transcripts</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input */}
          <UrlInput 
            url={url}
            onChange={setUrl}
            onProcess={processUrl}
            isProcessing={isProcessing}
          />

          {/* Processing Status */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-spin" />
                <span>{status}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Success Status */}
          {!isProcessing && transcript && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{status}</span>
            </div>
          )}

          {/* Content Preview */}
          {metadata && transcript && (
            <SimplifiedPreviewSection
              metadata={metadata}
              transcript={transcript}
              contentType={contentType}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            {metadata && transcript && (
              <Button onClick={handleImport} className="bg-primary hover:bg-primary/90">
                <FileText className="h-4 w-4 mr-2" />
                Import to Notes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
