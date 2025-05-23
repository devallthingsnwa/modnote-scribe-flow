
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
import { Checkbox } from "@/components/ui/checkbox";
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
  fetchYouTubeTranscript
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
          
          // Use real transcript API with better error handling
          try {
            console.log("Fetching transcript for video ID:", videoId);
            const fetchedTranscript = await fetchYouTubeTranscript(videoId);
            console.log("Received transcript:", fetchedTranscript?.substring(0, 100) + "...");
            
            setTranscript(fetchedTranscript);
            
            // Check if transcript is valid
            if (fetchedTranscript && 
                !fetchedTranscript.startsWith("Error") && 
                !fetchedTranscript.includes("No transcript available") &&
                !fetchedTranscript.includes("Unable to fetch transcript") &&
                fetchedTranscript.trim().length > 20) {
              toast.success("Transcript fetched successfully!");
            } else {
              toast.warning("Transcript might be incomplete or unavailable for this video.");
            }
          } catch (error) {
            console.error("Error fetching transcript:", error);
            const errorMessage = "No transcript available for this video. The video may not have captions enabled.";
            setTranscript(errorMessage);
            toast.error("Failed to fetch transcript. The video might not have captions available.");
          }
        } else {
          setThumbnail("https://placehold.co/600x400/eee/999?text=Cannot+Extract+YouTube+ID");
          setTranscript("Invalid YouTube URL. Could not extract video ID.");
          toast.error("Invalid YouTube URL. Could not extract video ID.");
        }
      } else {
        // For non-YouTube URLs, show a placeholder image
        setThumbnail("https://placehold.co/600x400/eee/999?text=Content+Preview");
        setTranscript("Non-YouTube content preview not available.");
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
    setProgress(20);
    
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
            setProgress(40);
            finalTranscript = await fetchYouTubeTranscript(videoId);
            setTranscript(finalTranscript);
          } catch (error) {
            console.error("Error fetching transcript during import:", error);
            finalTranscript = "Transcript could not be fetched for this video.";
          }
        }
      }
      
      setProgress(60);
      
      // Create the final content structure
      let finalContent = "";
      
      if (finalTranscript && 
          !finalTranscript.startsWith("Error") && 
          !finalTranscript.includes("No transcript available") &&
          !finalTranscript.includes("Transcript could not be fetched") &&
          finalTranscript.trim().length > 50) {
        
        // Check if any AI processing is requested
        const needsAIProcessing = enableSummary || enableHighlights || enableKeyPoints;
        
        if (needsAIProcessing) {
          setProgress(70);
          
          // Process with AI if any options are enabled
          try {
            const { data: aiData, error: aiError } = await supabase.functions.invoke('process-content-with-deepseek', {
              body: { 
                content: finalTranscript, 
                type: type,
                options: {
                  summary: enableSummary,
                  highlights: enableHighlights,
                  keyPoints: enableKeyPoints
                }
              }
            });

            if (aiError) {
              console.error("AI processing error:", aiError);
              toast.warning("AI processing failed, importing raw transcript instead.");
              finalContent = `# ${noteTitle}\n\n` +
                `**Source:** ${url}\n\n` +
                `## Transcript\n\n${finalTranscript}`;
            } else if (aiData?.processedContent) {
              finalContent = `# ${noteTitle}\n\n` +
                `**Source:** ${url}\n\n` +
                `${aiData.processedContent}\n\n` +
                `## Original Transcript\n\n${finalTranscript}`;
            } else {
              finalContent = `# ${noteTitle}\n\n` +
                `**Source:** ${url}\n\n` +
                `## Transcript\n\n${finalTranscript}`;
            }
          } catch (error) {
            console.error("Error processing with AI:", error);
            toast.warning("AI processing failed, importing raw transcript instead.");
            finalContent = `# ${noteTitle}\n\n` +
              `**Source:** ${url}\n\n` +
              `## Transcript\n\n${finalTranscript}`;
          }
        } else {
          // Just import raw transcript
          finalContent = `# ${noteTitle}\n\n` +
            `**Source:** ${url}\n\n` +
            `## Transcript\n\n${finalTranscript}`;
        }
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
      
      const hasAIProcessing = enableSummary || enableHighlights || enableKeyPoints;
      if (finalTranscript && !finalTranscript.includes("could not be fetched")) {
        if (hasAIProcessing) {
          toast.success("Content imported with AI analysis!");
        } else {
          toast.success("Content imported with transcript!");
        }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Content</DialogTitle>
          <DialogDescription>
            Import from YouTube, podcast, or text source for automatic transcription and AI analysis.
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
          
          {transcript && !transcript.includes("Error") && !transcript.includes("No transcript available") && currentStep !== "processing" && currentStep !== "complete" && (
            <div className="flex flex-col gap-3">
              <Label>AI Analysis Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="summary" 
                    checked={enableSummary}
                    onCheckedChange={(checked) => setEnableSummary(checked as boolean)}
                  />
                  <Label htmlFor="summary" className="text-sm font-normal">
                    Generate Summary
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="highlights" 
                    checked={enableHighlights}
                    onCheckedChange={(checked) => setEnableHighlights(checked as boolean)}
                  />
                  <Label htmlFor="highlights" className="text-sm font-normal">
                    Extract Key Highlights
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="keypoints" 
                    checked={enableKeyPoints}
                    onCheckedChange={(checked) => setEnableKeyPoints(checked as boolean)}
                  />
                  <Label htmlFor="keypoints" className="text-sm font-normal">
                    Generate Key Points
                  </Label>
                </div>
              </div>
            </div>
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
          >
            {currentStep === "processing" ? "Processing..." : "Import Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
