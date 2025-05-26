
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

// Import refactored components
import { ImportSteps } from "./import/ImportSteps";
import { ContentTypeSelector } from "./import/ContentTypeSelector";
import { UrlInput } from "./import/UrlInput";
import { EnhancedVideoPreview } from "./import/EnhancedVideoPreview";
import { ProcessingStatus } from "./import/ProcessingStatus";
import { VideoNoteProcessor } from "@/lib/videoNoteProcessor";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (url: string, type: string) => void;
}

export function ImportModal({ open, onOpenChange, onImport }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"video" | "audio" | "text">("video");
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"url" | "preview" | "processing" | "complete">("url");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [enableSummary, setEnableSummary] = useState(false);
  const [enableHighlights, setEnableHighlights] = useState(false);
  const [enableKeyPoints, setEnableKeyPoints] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset states when URL changes
    setThumbnail(null);
    setTranscript(null);
    setMetadata(null);
    setCurrentStep("url");
  };

  const handleFetchPreview = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setCurrentStep("preview");
    
    try {
      // Check if it's a YouTube URL
      const videoId = VideoNoteProcessor.extractVideoId(url);
      
      if (videoId) {
        console.log("Processing YouTube video:", videoId);
        
        // Process the video to get metadata and thumbnail
        const result = await VideoNoteProcessor.processVideo(videoId, {
          fetchMetadata: true,
          fetchTranscript: false // Don't fetch transcript yet, just preview
        });
        
        if (result.success && result.metadata) {
          setMetadata(result.metadata);
          setThumbnail(result.metadata.thumbnail || VideoNoteProcessor.generateThumbnailUrl(videoId));
          toast.success("Preview loaded successfully!");
        } else {
          // Fallback if metadata fetch fails
          setThumbnail(VideoNoteProcessor.generateThumbnailUrl(videoId));
          setMetadata({ 
            title: `YouTube Video ${videoId}`,
            author: 'Unknown',
            duration: 'Unknown'
          });
          toast.info("Preview loaded with limited metadata.");
        }
      } else {
        // For non-YouTube URLs, show a placeholder
        setThumbnail("https://placehold.co/600x400/eee/999?text=Media+Preview");
        setMetadata({ title: "Media Content" });
        toast.info("Media content detected. Ready for transcription.");
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      toast.error("Failed to fetch preview. Please check your URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!url || !user) return;
    
    setCurrentStep("processing");
    setProgress(20);
    
    try {
      const videoId = VideoNoteProcessor.extractVideoId(url);
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL. Could not extract video ID.');
      }
      
      setProgress(40);
      
      // Process the video to get transcript and metadata
      console.log("Processing video for import:", videoId);
      const result = await VideoNoteProcessor.processVideo(videoId, {
        fetchMetadata: true,
        fetchTranscript: true,
        generateSummary: false // We'll handle AI processing separately
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process video');
      }
      
      let noteTitle = result.metadata?.title || `YouTube Video ${videoId}`;
      let finalThumbnail = result.metadata?.thumbnail || thumbnail || VideoNoteProcessor.generateThumbnailUrl(videoId);
      
      setProgress(70);
      
      // Process with AI if options are enabled
      let finalContent = "";
      const needsAIProcessing = enableSummary || enableHighlights || enableKeyPoints;
      
      if (needsAIProcessing && result.transcript && result.transcript !== "Transcript not available for this video. You can add your own notes here.") {
        try {
          console.log("Processing content with DeepSeek AI...");
          const { data: aiData, error: aiError } = await supabase.functions.invoke('process-content-with-deepseek', {
            body: { 
              content: result.transcript, 
              type: 'video',
              options: {
                summary: enableSummary,
                highlights: enableHighlights,
                keyPoints: enableKeyPoints
              }
            }
          });

          if (aiData?.processedContent) {
            finalContent = `# ${noteTitle}\n\n` +
              `**Source:** ${url}\n` +
              `**Author:** ${result.metadata?.author || 'Unknown'}\n` +
              `**Duration:** ${result.metadata?.duration || 'Unknown'}\n\n` +
              `${aiData.processedContent}\n\n` +
              `## Original Transcript\n\n${result.transcript}`;
          }
        } catch (error) {
          console.error("DeepSeek AI processing failed:", error);
          toast.warning("DeepSeek AI processing failed, importing raw transcript instead.");
        }
      }
      
      // Fallback to raw transcript
      if (!finalContent) {
        finalContent = `# ${noteTitle}\n\n` +
          `**Source:** ${url}\n` +
          `**Author:** ${result.metadata?.author || 'Unknown'}\n` +
          `**Duration:** ${result.metadata?.duration || 'Unknown'}\n\n` +
          `## Transcript\n\n${result.transcript || 'Transcription not available'}`;
      }
      
      setProgress(90);
      
      // Create the note in the database
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          title: noteTitle,
          content: finalContent,
          user_id: user.id,
          source_url: url,
          thumbnail: finalThumbnail,
          is_transcription: true,
        })
        .select()
        .single();
      
      if (noteError) {
        throw noteError;
      }
      
      setProgress(100);
      setCurrentStep("complete");
      
      // Invalidate queries to refresh notes list
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      
      // Call the onImport handler
      onImport(url, 'video');
      
      const hasAIProcessing = enableSummary || enableHighlights || enableKeyPoints;
      if (result.transcript && result.transcript !== "Transcript not available for this video. You can add your own notes here.") {
        if (hasAIProcessing) {
          toast.success("Content imported with DeepSeek AI analysis!");
        } else {
          toast.success("Content transcribed and imported!");
        }
      } else {
        toast.success("Video imported (transcript not available)!");
      }
      
      // Close modal after completion
      setTimeout(() => {
        onOpenChange(false);
        // Reset state
        setUrl("");
        setThumbnail(null);
        setTranscript(null);
        setMetadata(null);
        setCurrentStep("url");
        setProgress(0);
        setEnableSummary(false);
        setEnableHighlights(false);
        setEnableKeyPoints(false);
      }, 1500);
      
    } catch (error: any) {
      console.error("Error importing content:", error);
      toast.error(`Error importing content: ${error.message}`);
      setCurrentStep("url");
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Import Multimedia Content</span>
            <Badge variant="secondary" className="text-xs">
              Auto-Transcription
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Import from YouTube with automatic transcription and thumbnail extraction.
          </DialogDescription>
        </DialogHeader>
        
        <ImportSteps currentStep={currentStep} />
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">YouTube URL</Label>
              <UrlInput 
                url={url}
                onChange={handleUrlChange}
                onFetchPreview={handleFetchPreview}
                isLoading={isLoading}
                disabled={!user}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label>Content Type</Label>
              <ContentTypeSelector type={type} setType={setType} />
            </div>
          </div>
          
          {/* Enhanced Preview */}
          {(thumbnail || metadata) && (
            <EnhancedVideoPreview
              thumbnail={thumbnail}
              transcript={transcript}
              url={url}
              enableSummary={enableSummary}
              enableHighlights={enableHighlights}
              enableKeyPoints={enableKeyPoints}
              onSummaryChange={setEnableSummary}
              onHighlightsChange={setEnableHighlights}
              onKeyPointsChange={setEnableKeyPoints}
            />
          )}
          
          <ProcessingStatus currentStep={currentStep} progress={progress} />
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleImport}
            disabled={!url || currentStep === "processing" || currentStep === "complete" || !user}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {currentStep === "processing" ? "Transcribing..." : "Import & Transcribe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
