
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

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset thumbnail when URL changes
    setThumbnail(null);
    setCurrentStep("url");
  };

  const handleFetchPreview = () => {
    if (!url) return;
    
    setIsLoading(true);
    setCurrentStep("preview");
    
    // Simulate fetching thumbnail - in a real app, this would be an API call
    setTimeout(() => {
      // YouTube URL - show placeholder thumbnail
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = url.includes("youtube.com/watch?v=")
          ? url.split("v=")[1]?.split("&")[0]
          : url.includes("youtu.be/")
          ? url.split("youtu.be/")[1]?.split("?")[0]
          : null;
          
        if (videoId) {
          setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
        }
      } else {
        // For demo purposes, show a placeholder image
        setThumbnail("https://placehold.co/600x400/eee/999?text=Content+Preview");
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const handleImport = () => {
    if (!url) return;
    
    setCurrentStep("processing");
    
    // Simulate processing progress
    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += 5;
      setProgress(progressValue);
      
      if (progressValue >= 100) {
        clearInterval(interval);
        setCurrentStep("complete");
        
        // Call the import handler
        onImport(url, type);
        
        // Close modal after completion
        setTimeout(() => {
          onOpenChange(false);
          // Reset state
          setUrl("");
          setThumbnail(null);
          setCurrentStep("url");
          setProgress(0);
        }, 1500);
      }
    }, 150);
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
                disabled={!url || isLoading}
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
            disabled={!url || currentStep === "processing" || currentStep === "complete"}
          >
            {currentStep === "processing" ? "Processing..." : "Import Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
