
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Video, Mic, FileText, Youtube, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { getTranscript } from "youtube-transcript";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Extract YouTube video ID from various YouTube URL formats
  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset thumbnail when URL changes
    setThumbnail(null);
    setTranscript(null);
    setCurrentStep("url");
  };

  const handleFetchPreview = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setCurrentStep("preview");
    
    // For YouTube URLs, attempt to fetch thumbnail using the video ID
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = extractYouTubeId(url);
          
      if (videoId) {
        setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
        
        // Fetch transcript for YouTube videos
        try {
          const transcriptData = await getTranscript({ videoID: videoId });
          if (transcriptData && transcriptData.length > 0) {
            // Join all transcript pieces and format them
            const fullTranscript = transcriptData
              .map(item => `[${formatTimestamp(item.offset)}] ${item.text}`)
              .join('\n');
            
            setTranscript(fullTranscript);
            toast.success("Transcript fetched successfully!");
          } else {
            toast.error("No transcript found for this video.");
            setTranscript(null);
          }
        } catch (error) {
          console.error("Error fetching transcript:", error);
          toast.error("Failed to fetch transcript. The video might not have captions available.");
          setTranscript(null);
        }
      } else {
        setThumbnail("https://placehold.co/600x400/eee/999?text=Cannot+Extract+YouTube+ID");
      }
    } else {
      // For non-YouTube URLs, show a placeholder image
      setThumbnail("https://placehold.co/600x400/eee/999?text=Content+Preview");
    }
    
    setIsLoading(false);
  };

  // Helper function to format timestamp from milliseconds to MM:SS
  const formatTimestamp = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleImport = async () => {
    if (!url || !user) return;
    
    setCurrentStep("processing");
    
    try {
      // Create a simple title from the URL
      let noteTitle = "Imported Content";
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        noteTitle = `YouTube ${type === "video" ? "Video" : type === "audio" ? "Audio" : "Content"}`;
      }
      
      // Use incremental progress to simulate processing
      let progressValue = 0;
      const progressInterval = setInterval(() => {
        progressValue += 5;
        setProgress(progressValue);
        
        if (progressValue >= 100) {
          clearInterval(progressInterval);
          completeImport();
        }
      }, 150);
      
      // Prepare content for the note based on availability of transcript
      const initialContent = transcript 
        ? `Imported from: ${url}\n\n# Transcript\n\n${transcript}`
        : `Imported from: ${url}\n\nTranscription in progress...`;
        
      // Create the note in the database
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          title: noteTitle,
          content: initialContent,
          user_id: user.id,
          source_url: url,
          thumbnail: thumbnail,
          is_transcription: true,
          has_transcript: !!transcript,
        })
        .select()
        .single();
      
      if (noteError) {
        clearInterval(progressInterval);
        throw noteError;
      }
      
      // Simulate API call to process the content
      const completeImport = async () => {
        try {
          setCurrentStep("complete");
          
          // Update the note with "processed" content if no transcript was found
          if (!transcript) {
            const demoContent = `# Imported Content\n\n` +
              `Source: ${url}\n\n` +
              `## Summary\n\n` +
              `This is a placeholder for the actual transcription and summary that would be generated from the ${type} content.\n\n`;
              
            await supabase
              .from('notes')
              .update({ 
                content: demoContent,
                updated_at: new Date().toISOString()
              })
              .eq('id', noteData.id);
          }
          
          // Invalidate queries to refresh notes list
          queryClient.invalidateQueries({ queryKey: ['notes'] });
          
          // Call the onImport handler
          onImport(url, type);
          
          toast.success("Content successfully imported!");
          
          // Close modal after completion
          setTimeout(() => {
            onOpenChange(false);
            // Reset state
            setUrl("");
            setThumbnail(null);
            setTranscript(null);
            setCurrentStep("url");
            setProgress(0);
          }, 1500);
        } catch (error: any) {
          toast.error(`Error completing import: ${error.message}`);
        }
      };
    } catch (error: any) {
      toast.error(`Error importing content: ${error.message}`);
      setCurrentStep("url");
    }
  };

  const getStepIcon = (step: string, currentStep: string) => {
    const active = step === currentStep;
    const completed = 
      (step === "url" && (currentStep === "preview" || currentStep === "processing" || currentStep === "complete")) || 
      (step === "preview" && (currentStep === "processing" || currentStep === "complete")) || 
      (step === "processing" && currentStep === "complete");
      
    const baseClasses = "h-8 w-8 p-1 rounded-full";
    const activeClasses = "bg-primary text-primary-foreground";
    const completedClasses = "bg-green-500 text-white";
    const inactiveClasses = "bg-muted text-muted-foreground";
    
    return completed ? completedClasses : active ? activeClasses : inactiveClasses;
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
        
        <div className="flex justify-between items-center py-4 px-2">
          <div className="flex flex-col items-center">
            <div className={`${getStepIcon("url", currentStep)} flex items-center justify-center`}>
              <Youtube className="h-4 w-4" />
            </div>
            <span className="text-xs mt-1">URL</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col items-center">
            <div className={`${getStepIcon("preview", currentStep)} flex items-center justify-center`}>
              <Video className="h-4 w-4" />
            </div>
            <span className="text-xs mt-1">Transcript</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col items-center">
            <div className={`${getStepIcon("processing", currentStep)} flex items-center justify-center`}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs mt-1">Summarize</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col items-center">
            <div className={`${getStepIcon("complete", currentStep)} flex items-center justify-center`}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xs mt-1">Save</span>
          </div>
        </div>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="url">Content URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={handleUrlChange}
                className="flex-1"
              />
              <Button
                type="button" 
                variant="secondary"
                onClick={handleFetchPreview}
                disabled={!url || isLoading || !user}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Preview"
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label>Content Type</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={type === "video" ? "default" : "outline"}
                onClick={() => setType("video")}
                className="flex gap-2"
              >
                <Video className="h-4 w-4" />
                <span>Video</span>
              </Button>
              <Button
                type="button"
                variant={type === "audio" ? "default" : "outline"}
                onClick={() => setType("audio")}
                className="flex gap-2"
              >
                <Mic className="h-4 w-4" />
                <span>Audio</span>
              </Button>
              <Button
                type="button"
                variant={type === "text" ? "default" : "outline"}
                onClick={() => setType("text")}
                className="flex gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Text</span>
              </Button>
            </div>
          </div>
          
          {thumbnail && (
            <div className="flex flex-col gap-2">
              <Label>Preview</Label>
              <div className="overflow-hidden rounded-md border border-border">
                <img 
                  src={thumbnail} 
                  alt="Content preview" 
                  className="w-full h-auto object-cover" 
                />
              </div>
            </div>
          )}
          
          {transcript && (
            <div className="flex flex-col gap-2">
              <Label>Transcript Preview</Label>
              <div className="p-3 bg-muted rounded-md border border-border overflow-y-auto max-h-48 text-xs font-mono">
                {transcript.split('\n').slice(0, 20).map((line, index) => (
                  <div key={index} className="mb-1">{line}</div>
                ))}
                {transcript.split('\n').length > 20 && (
                  <div className="text-muted-foreground italic">
                    (Showing first 20 lines of {transcript.split('\n').length} total lines)
                  </div>
                )}
              </div>
            </div>
          )}
          
          {currentStep === "processing" && (
            <div className="flex flex-col gap-2">
              <Label>Processing Content</Label>
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Transcribing content...</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === "complete" && (
            <div className="flex flex-col gap-2">
              <Label>Processing Complete</Label>
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-green-600 dark:text-green-400 text-sm">
                Content has been transcribed, summarized, and saved to your notes!
              </div>
            </div>
          )}
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
