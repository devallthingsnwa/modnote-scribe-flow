
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, FileText, Upload, Mic } from "lucide-react";
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
  const [hasWarning, setHasWarning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setUrl("");
    setMetadata(null);
    setTranscript(null);
    setContentType("");
    setProgress(0);
    setStatus("");
    setIsProcessing(false);
    setHasWarning(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setStatus("Processing file...");
      setProgress(30);
      
      // Simulate file processing
      setTimeout(() => {
        setMetadata({
          title: file.name,
          author: "File Upload",
          description: `Uploaded file: ${file.name}`
        });
        setTranscript(`File uploaded: ${file.name}\n\nAdd your notes about this file here...`);
        setContentType('file');
        setStatus("✅ File uploaded successfully!");
        setProgress(100);
        setIsProcessing(false);
      }, 1500);
    }
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsProcessing(true);
      setStatus("Processing voice recording...");
      setProgress(50);
      
      // Simulate voice processing
      setTimeout(() => {
        setMetadata({
          title: "Voice Recording",
          author: "Voice Note",
          description: "Audio recording transcription"
        });
        setTranscript("Your voice recording transcript would appear here...\n\nAdd additional notes below:");
        setContentType('voice');
        setStatus("✅ Voice recording processed!");
        setProgress(100);
        setIsProcessing(false);
      }, 2000);
    } else {
      // Start recording
      setIsRecording(true);
      setStatus("🎤 Recording... Click again to stop");
      toast({
        title: "Recording Started",
        description: "Speak now. Click the microphone again to stop recording.",
      });
    }
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

        // Always treat result as success since we now provide fallback content
        if (result.success && result.text) {
          setTranscript(result.text);
          
          // Check if this is a warning result
          const isWarning = result.metadata?.isWarning || result.provider === 'warning-fallback';
          setHasWarning(isWarning);
          
          // Get metadata with fallback
          const videoId = TranscriptionService.extractVideoId(url);
          let videoMetadata = null;
          
          if (videoId) {
            try {
              videoMetadata = await TranscriptionService.getYouTubeMetadata(videoId);
            } catch (error) {
              console.warn('Failed to fetch video metadata:', error);
            }
          }
          
          setMetadata({
            title: videoMetadata?.title || `YouTube Video ${videoId || 'Unknown'}`,
            author: videoMetadata?.author || 'YouTube',
            duration: videoMetadata?.duration || 'Unknown',
            thumbnail: videoMetadata?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          });
          
          if (isWarning) {
            setStatus("⚠️ Video saved with warning - transcript unavailable");
          } else {
            setStatus("✅ Transcript extracted successfully!");
          }
          setProgress(100);
        } else {
          throw new Error(result.error || 'Failed to process video');
        }
      } else {
        // Handle other URL types (articles, podcasts, etc.)
        setContentType('article');
        setStatus("Processing article/content...");
        setProgress(50);
        
        const result = await TranscriptionService.transcribeWithFallback(url);
        
        if (result.success && result.text) {
          setTranscript(result.text);
          const isWarning = result.metadata?.isWarning || result.provider === 'warning-fallback';
          setHasWarning(isWarning);
          
          setMetadata({
            title: "Article Content",
            author: "Web Content",
            description: "Content extracted from provided URL"
          });
          
          if (isWarning) {
            setStatus("⚠️ Content saved with warning - extraction unavailable");
          } else {
            setStatus("✅ Content extracted successfully!");
          }
          setProgress(100);
        } else {
          throw new Error(result.error || 'Failed to process content');
        }
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

    let noteContent = '';
    
    if (contentType === 'youtube') {
      noteContent = `# 🎥 ${metadata.title}\n\n**Source:** ${url}\n**Type:** Video Transcript\n**Imported:** ${new Date().toLocaleString()}\n${hasWarning ? '**Status:** ⚠️ Transcript unavailable - manual notes only\n' : ''}\n---\n\n## 📝 ${hasWarning ? 'Notes' : 'Transcript'}\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    } else if (contentType === 'voice') {
      noteContent = `# 🎤 ${metadata.title}\n\n**Type:** Voice Recording\n**Imported:** ${new Date().toLocaleString()}\n---\n\n## 📝 Transcript\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    } else if (contentType === 'file') {
      noteContent = `# 📄 ${metadata.title}\n\n**Type:** File Upload\n**Imported:** ${new Date().toLocaleString()}\n---\n\n## 📝 Content\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    } else {
      noteContent = `# 📄 ${metadata.title}\n\n**Source:** ${url}\n**Type:** Article/Content\n**Imported:** ${new Date().toLocaleString()}\n${hasWarning ? '**Status:** ⚠️ Content unavailable - manual notes only\n' : ''}\n---\n\n## 📝 ${hasWarning ? 'Notes' : 'Content'}\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    }

    onImport({
      title: metadata.title,
      content: noteContent,
      source_url: contentType === 'youtube' || contentType === 'article' ? url : undefined,
      thumbnail: metadata.thumbnail,
      is_transcription: (contentType === 'youtube' && !hasWarning) || contentType === 'voice'
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
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Import from URL</h3>
            <UrlInput 
              url={url}
              onChange={handleUrlChange}
              onFetchPreview={processUrl}
              isLoading={isProcessing}
              disabled={false}
              buttonText="Extract"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or upload files
              </span>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Upload Files</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Drop files here or click to upload</p>
                <p className="text-xs text-gray-500">Supports PDF, DOCX, TXT, audio, and video files</p>
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.docx,.txt,.mp3,.mp4,.wav,.m4a"
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or record voice
              </span>
            </div>
          </div>

          {/* Voice Recording Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Voice Recording</h3>
            <div className="text-center">
              <Button
                onClick={handleVoiceRecording}
                variant={isRecording ? "destructive" : "outline"}
                size="lg"
                className={`w-full ${isRecording ? 'animate-pulse' : ''}`}
                disabled={isProcessing && !isRecording}
              >
                <Mic className="h-5 w-5 mr-2" />
                {isRecording ? "Stop Recording" : "Start Voice Recording"}
              </Button>
              {isRecording && (
                <p className="text-sm text-muted-foreground mt-2">
                  🎤 Recording in progress... Click "Stop Recording" when done
                </p>
              )}
            </div>
          </div>

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
            <div className={`flex items-center gap-2 text-sm ${hasWarning ? 'text-orange-600' : 'text-green-600'}`}>
              {hasWarning ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
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
                {hasWarning ? 'Save Note with Warning' : 'Import to Notes'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
