
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Save, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreateNote } from "@/lib/api";

interface NoteGPTProcessorProps {
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  transcript: string;
  onSaveComplete?: (noteId: string) => void;
}

interface AISummary {
  keyPoints: string[];
  mainTopics: string[];
  actionItems: string[];
  oneLineSummary: string;
  detailedSummary: string;
}

export function NoteGPTProcessor({ 
  videoId, 
  videoTitle, 
  videoUrl, 
  transcript, 
  onSaveComplete 
}: NoteGPTProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const createNoteMutation = useCreateNote();

  const generateAISummary = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-content-with-openai', {
        body: {
          content: transcript,
          prompt: `Analyze this YouTube video transcript and provide:
1. A one-line summary
2. 5-7 key points (as bullet points)
3. Main topics/themes (as keywords)
4. 3-5 actionable items or takeaways
5. A detailed summary (2-3 paragraphs)

Format your response as JSON with these keys: oneLineSummary, keyPoints, mainTopics, actionItems, detailedSummary`,
          options: {
            model: 'gpt-4o-mini',
            temperature: 0.3
          }
        }
      });

      if (error) throw error;

      // Parse the AI response
      let parsedSummary: AISummary;
      try {
        parsedSummary = JSON.parse(data.processedContent);
      } catch {
        // Fallback parsing if JSON parsing fails
        parsedSummary = {
          oneLineSummary: data.processedContent.split('\n')[0] || 'Summary generated',
          keyPoints: data.processedContent.split('\n').filter(line => line.includes('•') || line.includes('-')).slice(0, 7),
          mainTopics: ['AI Analysis', 'Video Content', 'Key Insights'],
          actionItems: ['Review content', 'Take notes', 'Apply learnings'],
          detailedSummary: data.processedContent
        };
      }

      setSummary(parsedSummary);
      toast({
        title: "AI Summary Generated",
        description: "Your transcript has been analyzed successfully.",
      });
    } catch (error) {
      console.error('AI processing error:', error);
      toast({
        title: "AI Processing Failed",
        description: "Unable to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [transcript, toast]);

  const saveAsNote = useCallback(async () => {
    if (!summary) return;

    setIsSaving(true);
    try {
      const noteContent = `# 🎥 ${videoTitle}

**Source:** [${videoUrl}](${videoUrl})
**Type:** Video Transcript with AI Analysis

---

## 📝 AI Summary

${summary.oneLineSummary}

### Key Points
${summary.keyPoints.map(point => `• ${point}`).join('\n')}

### Main Topics
${summary.mainTopics.map(topic => `#${topic}`).join(' ')}

### Action Items
${summary.actionItems.map(item => `✅ ${item}`).join('\n')}

### Detailed Analysis
${summary.detailedSummary}

---

## 📜 Full Transcript

${transcript}

---

## 💭 My Notes

*Add your personal notes here...*
`;

      const newNote = {
        title: `📺 ${videoTitle}`,
        content: noteContent,
        source_url: videoUrl,
        is_transcription: true,
        tags: ['youtube', 'transcript', 'ai-summary', ...summary.mainTopics.slice(0, 3).map(topic => topic.toLowerCase())]
      };

      createNoteMutation.mutate(newNote, {
        onSuccess: (data) => {
          toast({
            title: "Note Saved Successfully",
            description: "Your transcript and AI summary have been saved as a note.",
          });
          onSaveComplete?.(data.id);
        },
        onError: (error) => {
          toast({
            title: "Save Failed",
            description: "Unable to save note. Please try again.",
            variant: "destructive",
          });
          console.error('Save error:', error);
        }
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "An error occurred while saving the note.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [summary, videoTitle, videoUrl, transcript, createNoteMutation, toast, onSaveComplete]);

  const exportContent = useCallback(() => {
    if (!summary) return;

    const exportData = {
      video: {
        title: videoTitle,
        url: videoUrl,
        videoId: videoId
      },
      summary: summary,
      transcript: transcript,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notegpt-${videoId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Your analysis has been exported successfully.",
    });
  }, [summary, videoTitle, videoUrl, videoId, transcript, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI-Powered Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!summary ? (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Generate an AI-powered summary and analysis of your video transcript
              </p>
              <Button 
                onClick={generateAISummary} 
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Summary
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* One-line Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Quick Summary</h3>
                  <p className="text-blue-800">{summary.oneLineSummary}</p>
                </CardContent>
              </Card>

              {/* Key Points */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🎯 Key Points
                </h3>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point, index) => (
                    <li key={index} className="flex gap-3">
                      <Badge variant="secondary" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Main Topics */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🏷️ Main Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {summary.mainTopics.map((topic, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Items */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  ✅ Action Items
                </h3>
                <ul className="space-y-2">
                  {summary.actionItems.map((item, index) => (
                    <li key={index} className="flex gap-3 items-start">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  📖 Detailed Analysis
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {summary.detailedSummary}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={saveAsNote} 
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save as Note
                    </>
                  )}
                </Button>
                <Button 
                  onClick={exportContent}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Analysis
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
