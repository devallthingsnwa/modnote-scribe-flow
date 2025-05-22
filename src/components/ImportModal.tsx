
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
import { Loader2, Video, Mic, FileText } from "lucide-react";

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

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset thumbnail when URL changes
    setThumbnail(null);
  };

  const handleFetchPreview = () => {
    if (!url) return;
    
    setIsLoading(true);
    
    // Simulate fetching thumbnail - in a real app, this would be an API call
    setTimeout(() => {
      // YouTube URL - show placeholder thumbnail
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = url.includes("youtube.com/watch?v=")
          ? url.split("v=")[1].split("&")[0]
          : url.includes("youtu.be/")
          ? url.split("youtu.be/")[1].split("?")[0]
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
    
    onImport(url, type);
    onOpenChange(false);
    
    // Reset state after import
    setUrl("");
    setThumbnail(null);
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
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleImport}
            disabled={!url}
          >
            Import Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
