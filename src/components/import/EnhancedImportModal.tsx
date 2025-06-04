
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Video, Upload, Mic, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedMediaProcessor } from "@/lib/transcription/enhancedMediaProcessor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioRecorder } from "@/components/audio/AudioRecorder";

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
  const [customTitle, setCustomTitle] = useState("");
  const [customContent, setCustomContent] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const detectMediaType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('spotify.com') || url.includes('soundcloud.com') || url.includes('anchor.fm')) return 'podcast';
    if (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a')) return 'audio';
    return 'general';
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
      console.log('🚀 Starting enhanced media processing for:', url);
      
      const result = await EnhancedMediaProcessor.processMediaUrl({
        url,
        options: {
          cleanTranscript: true,
          includeTimestamps: false,
          generateSummary: false
        }
      });

      console.log('📋 Processing result:', {
        success: result.success,
        title: result.title,
        hasContent: !!result.content,
        isTranscription: result.is_transcription
      });

      // Save to database
      const saveResult = await EnhancedMediaProcessor.saveToDatabase(result, user.id);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save to database');
      }

      // Trigger dashboard refresh
      onImport({
        title: result.title,
        content: result.content,
        source_url: result.source_url,
        thumbnail: result.thumbnail,
        is_transcription: result.is_transcription,
      });

      toast({
        title: "✅ Content Imported Successfully!",
        description: result.is_transcription 
          ? `Transcribed "${result.title}" with clean, spoken content only`
          : `Imported "${result.title}" (transcript unavailable - note created)`,
      });

      // Reset and close
      setUrl("");
      onClose();

    } catch (error) {
      console.error('💥 Import error:', error);
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
      // Call onImport to handle saving and refresh
      onImport({
        title,
        content,
        is_transcription: false,
      });

      toast({
        title: "Note created!",
        description: `Created "${title}"`,
      });

      // Reset form and close
      setCustomTitle("");
      setCustomContent("");
      onClose();
    } catch (error) {
      console.error('💥 Manual note creation error:', error);
      toast({
        title: "Failed to create note",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSpeechToText = (transcribedText: string) => {
    const enhancedContent = `# 🎤 Voice Note\n\n`;
    const timestamp = new Date().toLocaleString();
    
    let content = enhancedContent;
    content += `**Type:** Voice Transcription\n`;
    content += `**Recorded:** ${timestamp}\n`;
    content += `**Method:** Speech-to-Text AI\n\n`;
    content += `---\n\n`;
    content += `## 📝 Transcript\n\n`;
    content += transcribedText;
    content += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

    onImport({
      title: `Voice Note - ${timestamp}`,
      content,
      is_transcription: true,
    });

    toast({
      title: "✅ Voice Note Created!",
      description: "Your speech has been transcribed and saved",
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enhanced Content Import
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Media URL
            </TabsTrigger>
            <TabsTrigger value="speech" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Media URL (YouTube, Podcasts, Audio files)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://youtube.com/watch?v=... or podcast URL"
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
                        Processing...
                      </>
                    ) : (
                      <>
                        {detectMediaType(url) === 'youtube' && <Video className="h-4 w-4 mr-2" />}
                        {detectMediaType(url) === 'podcast' && <Volume2 className="h-4 w-4 mr-2" />}
                        {!['youtube', 'podcast'].includes(detectMediaType(url)) && <FileText className="h-4 w-4 mr-2" />}
                        Import
                      </>
                    )}
                  </Button>
                </div>
                
                {url && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Detected:</strong> {detectMediaType(url).charAt(0).toUpperCase() + detectMediaType(url).slice(1)} content
                      <br />
                      <strong>Features:</strong> Automatic transcription, metadata extraction, noise filtering, clean text output
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speech" className="space-y-4 mt-6">
            <div className="space-y-4">
              <AudioRecorder 
                onTranscription={handleSpeechToText}
                className="w-full"
              />
              
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300">
                  <strong>Enhanced Speech-to-Text:</strong> Uses advanced AI for high-quality transcription with automatic noise filtering and punctuation.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-6">
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
                  rows={8}
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
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">✨ Enhanced Features</h4>
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <li>• <strong>Smart Transcription:</strong> Extracts only spoken content, ignores background noise</li>
            <li>• <strong>Auto-Metadata:</strong> Fetches title, duration, thumbnail, and timestamps</li>
            <li>• <strong>Clean Format:</strong> Standardized output with sections for transcript and notes</li>
            <li>• <strong>Fallback Support:</strong> Creates useful notes even when transcription fails</li>
            <li>• <strong>Multi-Platform:</strong> Supports YouTube, podcasts, audio files, and more</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
