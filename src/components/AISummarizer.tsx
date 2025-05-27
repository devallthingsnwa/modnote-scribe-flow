
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, Video, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { VideoNoteProcessor } from "@/lib/videoNoteProcessor";
import { useCreateNote } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function AISummarizer() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const createNoteMutation = useCreateNote();
  const { user } = useAuth();

  const handleSummarize = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the AI Summarizer.",
        variant: "destructive"
      });
      return;
    }

    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a YouTube URL to summarize.",
        variant: "destructive"
      });
      return;
    }

    const videoId = VideoNoteProcessor.extractVideoId(url);
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Starting AI summarization for video:", videoId);

      // Process the video with transcript, metadata, and AI summary
      const result = await VideoNoteProcessor.processVideo(videoId, {
        fetchMetadata: true,
        fetchTranscript: true,
        generateSummary: true,
        summaryType: 'full',
        transcriptOptions: {
          includeTimestamps: true,
          language: 'en'
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process video');
      }

      // Create the enhanced note content
      let noteContent = `# 🎥 ${result.metadata?.title || 'YouTube Video'}\n\n`;
      noteContent += `**Source:** ${url}\n`;
      noteContent += `**Author:** ${result.metadata?.author || 'Unknown'}\n`;
      noteContent += `**Duration:** ${result.metadata?.duration || 'Unknown'}\n`;
      noteContent += `**Type:** AI Video Summary\n`;
      noteContent += `**Created:** ${new Date().toLocaleString()}\n\n`;
      
      if (result.summary) {
        noteContent += `---\n\n## 🤖 AI Summary\n\n${result.summary}\n\n`;
      }
      
      noteContent += `---\n\n## 📝 Full Transcript\n\n`;
      noteContent += result.transcript || 'Transcript not available';
      noteContent += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

      // Create the note
      const noteData = {
        title: result.metadata?.title || `YouTube Summary ${videoId}`,
        content: noteContent,
        source_url: url,
        thumbnail: result.metadata?.thumbnail,
        is_transcription: true
      };

      createNoteMutation.mutate(
        { note: noteData, tagIds: [] },
        {
          onSuccess: (data) => {
            toast({
              title: "Summary created!",
              description: `AI summary has been generated and saved as a new note.`
            });
            
            // Navigate to the new note
            if (data?.id) {
              navigate(`/note/${data.id}`);
            } else {
              navigate('/dashboard');
            }
          },
          onError: (error) => {
            console.error('Error creating summary note:', error);
            toast({
              title: "Error creating summary",
              description: "Failed to save the AI summary. Please try again.",
              variant: "destructive"
            });
          }
        }
      );

    } catch (error) {
      console.error('AI summarization error:', error);
      toast({
        title: "Summarization failed",
        description: error.message || "Failed to generate AI summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
              <Brain className="h-8 w-8 text-white" />
            </div>
            AI Video Summarizer
          </CardTitle>
          <p className="text-muted-foreground">
            Generate intelligent summaries from YouTube videos with timestamps and transcripts
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">YouTube URL</label>
            <div className="flex gap-3">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSummarize}
                disabled={isProcessing || !url.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Summarize
                  </>
                )}
              </Button>
            </div>
          </div>

          {isProcessing && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-6 w-6 border-2 border-blue-200 dark:border-blue-800 rounded-full" />
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Generating AI Summary...
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Fetching transcript, analyzing content, and creating your note
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Video className="h-4 w-4" />
              What you'll get:
            </h4>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-6">
              <li className="list-disc">Complete AI-generated summary</li>
              <li className="list-disc">Full transcript with timestamps</li>
              <li className="list-disc">Video metadata and information</li>
              <li className="list-disc">Narrative summary button for deeper analysis</li>
              <li className="list-disc">Saved as a new note for future reference</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
