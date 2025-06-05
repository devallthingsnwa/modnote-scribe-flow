
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, Video, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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
        description: "Please enter a URL to summarize.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // For now, create a basic note structure since transcript functionality is removed
      const noteContent = `# 📝 Content Summary\n\n**Source:** ${url}\n**Type:** Manual Summary\n**Created:** ${new Date().toLocaleString()}\n\n---\n\n## 📋 Summary Notes\n\nAdd your summary and notes about this content here...\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

      const noteData = {
        title: `Summary: ${url}`,
        content: noteContent,
        source_url: url,
        is_transcription: false
      };

      createNoteMutation.mutate(
        { note: noteData, tagIds: [] },
        {
          onSuccess: (data) => {
            toast({
              title: "Note created!",
              description: "A summary template has been created for manual input."
            });
            
            if (data?.id) {
              navigate(`/note/${data.id}`);
            } else {
              navigate('/dashboard');
            }
          },
          onError: (error) => {
            console.error('Error creating note:', error);
            toast({
              title: "Error creating note",
              description: "Failed to create the summary note. Please try again.",
              variant: "destructive"
            });
          }
        }
      );

    } catch (error) {
      console.error('Summarization error:', error);
      toast({
        title: "Error",
        description: "Failed to create summary note. Please try again.",
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
            Content Summarizer
          </CardTitle>
          <p className="text-muted-foreground">
            Create structured notes for content you want to summarize
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Content URL</label>
            <div className="flex gap-3">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/content..."
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Create Note
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Note Creation Features:
            </h4>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-6">
              <li className="list-disc">Creates structured note templates</li>
              <li className="list-disc">Automatically saved as a searchable note</li>
              <li className="list-disc">Ready for manual content input</li>
              <li className="list-disc">Organized sections for easy editing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
