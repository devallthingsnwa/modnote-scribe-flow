import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Video, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { VideoNoteProcessor } from "@/lib/videoNoteProcessor";
import { supabase } from "@/integrations/supabase/client";

interface ImportModalProps {
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

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customContent, setCustomContent] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const extractYouTubeId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleUrlImport = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to import content",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (isYouTubeUrl(url)) {
        // Process YouTube video
        const videoId = extractYouTubeId(url);
        if (!videoId) {
          throw new Error("Invalid YouTube URL");
        }

        console.log("Processing YouTube video:", videoId);

        // Use VideoNoteProcessor.processVideo to get both metadata and transcript
        const result = await VideoNoteProcessor.processVideo(videoId, {
          fetchMetadata: true,
          fetchTranscript: true,
          generateSummary: false,
        });

        console.log("Video processing result:", result);

        // Create content with the results
        const title = result.metadata?.title || `YouTube Video ${videoId}`;
        const author = result.metadata?.author || 'Unknown';
        const duration = result.metadata?.duration || 'Unknown';
        const thumbnail = result.metadata?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        let content = `# 🎥 ${title}\n\n`;
        content += `**Source:** ${url}\n`;
        content += `**Author:** ${author}\n`;
        content += `**Duration:** ${duration}\n`;
        content += `**Type:** Video ${result.transcript ? 'Transcript' : 'Note'}\n\n`;
        content += `---\n\n`;
        
        if (result.transcript && result.transcript.length > 100) {
          content += `## 📝 Transcript\n\n`;
          content += result.transcript;
        } else {
          content += `## 📝 Notes\n\n`;
          content += "Transcript could not be extracted for this video. You can add your own notes here...";
        }

        // Save to Supabase - this should always work regardless of transcript success
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title,
            content,
            source_url: url,
            thumbnail: thumbnail,
            is_transcription: !!result.transcript,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (noteError) {
          console.error('Error saving note to Supabase:', noteError);
          throw new Error('Failed to save note to database');
        }

        console.log('✅ Note saved to Supabase:', noteData.id);

        // Call onImport callback to refresh the dashboard
        onImport({
          title,
          content,
          source_url: url,
          thumbnail: thumbnail,
          is_transcription: !!result.transcript,
        });

        toast({
          title: "Video imported successfully!",
          description: result.transcript 
            ? `Imported "${title}" with transcript` 
            : `Imported "${title}" (transcript not available, but you can add notes)`,
        });
      } else {
        // Handle other URL types (web pages, etc.)
        const title = customTitle || `Imported from ${new URL(url).hostname}`;
        const content = customContent || `# ${title}\n\n**Source:** ${url}\n\n## Content\n\nAdd your notes here...`;
        
        // Save directly to Supabase
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title,
            content,
            source_url: url,
            is_transcription: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (noteError) {
          console.error('Error saving note to Supabase:', noteError);
          throw new Error('Failed to save note');
        }

        console.log('✅ Note saved to Supabase:', noteData.id);

        onImport({
          title,
          content,
          source_url: url,
          is_transcription: false,
        });

        toast({
          title: "Content imported successfully!",
          description: `Imported "${title}"`,
        });
      }

      // Reset form
      setUrl("");
      setCustomTitle("");
      setCustomContent("");
      onClose();

    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualNote = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create notes",
        variant: "destructive",
      });
      return;
    }

    const title = customTitle || "New Note";
    const content = customContent || "Start writing your note here...";
    
    try {
      // Save directly to Supabase
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          content,
          is_transcription: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (noteError) {
        console.error('Error saving note to Supabase:', noteError);
        throw new Error('Failed to save note');
      }

      console.log('✅ Manual note saved to Supabase:', noteData.id);

      onImport({
        title,
        content,
        is_transcription: false,
      });

      toast({
        title: "Note created!",
        description: `Created "${title}"`,
      });

      // Reset form
      setCustomTitle("");
      setCustomContent("");
      onClose();
    } catch (error) {
      console.error("Error creating manual note:", error);
      toast({
        title: "Failed to create note",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Content or Create Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Import Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Import from URL (YouTube videos will auto-extract metadata and attempt transcript)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/watch?v=... or any URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleUrlImport}
                  disabled={isProcessing || !url.trim()}
                  className="whitespace-nowrap"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isYouTubeUrl(url) ? "Processing..." : "Importing..."}
                    </>
                  ) : (
                    <>
                      {isYouTubeUrl(url) ? (
                        <Video className="h-4 w-4 mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Import
                    </>
                  )}
                </Button>
              </div>
              {isYouTubeUrl(url) && (
                <p className="text-xs text-muted-foreground mt-1">
                  📹 YouTube video detected - will extract metadata and attempt transcript (will save even if transcript fails)
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or create manually
              </span>
            </div>
          </div>

          {/* Manual Note Creation */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Enter note title..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <Textarea
                placeholder="Start writing your note content..."
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                rows={6}
              />
            </div>

            <Button
              onClick={handleManualNote}
              className="w-full"
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
