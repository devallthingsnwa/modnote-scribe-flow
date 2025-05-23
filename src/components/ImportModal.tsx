
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

// Import refactored components
import { ImportSteps } from "./import/ImportSteps";
import { ContentTypeSelector } from "./import/ContentTypeSelector";
import { UrlInput } from "./import/UrlInput";
import { PreviewSection } from "./import/PreviewSection";
import { TranscriptPreview } from "./import/TranscriptPreview";
import { ProcessingStatus } from "./import/ProcessingStatus";
import { 
  extractYouTubeId, 
  fetchYouTubeTranscript,
  processContentWithDeepSeek
} from "./import/ImportUtils";

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
  const [processedContent, setProcessedContent] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset states when URL changes
    setThumbnail(null);
    setTranscript(null);
    setProcessedContent(null);
    setCurrentStep("url");
  };

  const handleFetchPreview = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setCurrentStep("preview");
    
    try {
      // For YouTube URLs, attempt to fetch transcript using the video ID
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = extractYouTubeId(url);
            
        if (videoId) {
          setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
          
          // Use real transcript API
          try {
            const fetchedTranscript = await fetchYouTubeTranscript(videoId);
            setTranscript(fetchedTranscript);
            
            if (fetchedTranscript && !fetchedTranscript.startsWith("Error") && !fetchedTranscript.includes("No transcript available")) {
              toast.success("Transcript fetched successfully!");
            } else {
              toast.warning("Transcript might be incomplete or unavailable.");
            }
          } catch (error) {
            console.error("Error fetching transcript:", error);
            toast.error("Failed to fetch transcript. The video might not have captions available.");
            setTranscript("No transcript available for this video.");
          }
        } else {
          setThumbnail("https://placehold.co/600x400/eee/999?text=Cannot+Extract+YouTube+ID");
          toast.error("Invalid YouTube URL. Could not extract video ID.");
        }
      } else {
        // For non-YouTube URLs, show a placeholder image
        setThumbnail("https://placehold.co/600x400/eee/999?text=Content+Preview");
        toast.info("Non-YouTube URLs may have limited preview capabilities.");
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
    setProgress(10);
    
    try {
      // Create a simple title from the URL
      let noteTitle = "Imported Content";
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        noteTitle = `YouTube ${type === "video" ? "Video" : type === "audio" ? "Audio" : "Content"}`;
      }
      
      // If we don't have a transcript yet, try to fetch it
      let finalTranscript = transcript;
      if (!finalTranscript && (url.includes("youtube.com") || url.includes("youtu.be"))) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          try {
            setProgress(20);
            finalTranscript = await fetchYouTubeTranscript(videoId);
            setTranscript(finalTranscript);
          } catch (error) {
            console.error("Error fetching transcript during import:", error);
            finalTranscript = "Transcript could not be fetched for this video.";
          }
        }
      }
      
      setProgress(40);
      
      // Process content with DeepSeek if transcript is available and valid
      let summarizedContent = "";
      if (finalTranscript && 
          !finalTranscript.startsWith("Error") && 
          !finalTranscript.includes("No transcript available") &&
          !finalTranscript.includes("Transcript could not be fetched") &&
          finalTranscript.trim().length > 50) {
        
        try {
          setProgress(50);
          summarizedContent = await processContentWithDeepSeek(finalTranscript, type);
          setProcessedContent(summarizedContent);
          setProgress(70);
        } catch (error) {
          console.error("Error processing content with DeepSeek:", error);
          summarizedContent = "Content could not be processed with AI summarization.";
        }
      } else {
        summarizedContent = "No valid transcript available for AI processing.";
        setProgress(70);
      }
      
      // Create the final content structure
      let finalContent = "";
      
      if (summarizedContent && !summarizedContent.includes("could not be processed")) {
        finalContent = `# ${noteTitle}\n\n` +
          `**Source:** ${url}\n\n` +
          `## AI Summary\n\n${summarizedContent}\n\n` +
          `## Full Transcript\n\n${finalTranscript || "No transcript available"}`;
      } else if (finalTranscript && finalTranscript.trim().length > 0) {
        finalContent = `# ${noteTitle}\n\n` +
          `**Source:** ${url}\n\n` +
          `## Transcript\n\n${finalTranscript}`;
      } else {
        finalContent = `# ${noteTitle}\n\n` +
          `**Source:** ${url}\n\n` +
          `Content imported but transcript was not available.`;
      }
      
      setProgress(80);
      
      // Create the note in the database
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          title: noteTitle,
          content: finalContent,
          user_id: user.id,
          source_url: url,
          thumbnail: thumbnail,
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
      onImport(url, type);
      
      if (summarizedContent && !summarizedContent.includes("could not be processed")) {
        toast.success("Content successfully imported with AI summary!");
      } else if (finalTranscript && finalTranscript.trim().length > 0) {
        toast.success("Content imported with transcript!");
      } else {
        toast.success("Content imported (transcript not available)!");
      }
      
      // Close modal after completion
      setTimeout(() => {
        onOpenChange(false);
        // Reset state
        setUrl("");
        setThumbnail(null);
        setTranscript(null);
        setProcessedContent(null);
        setCurrentStep("url");
        setProgress(0);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Content</DialogTitle>
          <DialogDescription>
            Import from YouTube, podcast, or text source for automatic transcription and summarization.
          </DialogDescription>
        </DialogHeader>
        
        <ImportSteps currentStep={currentStep} />
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="url">Content URL</Label>
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
          
          <PreviewSection thumbnail={thumbnail} />
          
          <TranscriptPreview transcript={transcript} />
          
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
          >
            {currentStep === "processing" ? "Processing..." : "Import Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
