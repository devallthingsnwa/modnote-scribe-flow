import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Loader2, Download, Play, AlertCircle, AlertTriangle, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionService } from "@/lib/transcriptionService";
import { AudioRecorder } from "@/components/audio/AudioRecorder";

interface YouTubeTranscriptIntegrationProps {
  onTranscriptExtracted: (content: string) => void;
  className?: string;
}

export function YouTubeTranscriptIntegration({
  onTranscriptExtracted,
  className
}: YouTubeTranscriptIntegrationProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTranscript, setExtractedTranscript] = useState<string>("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const { toast } = useToast();

  const extractYouTubeId = (text: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };

  const detectYouTubeUrls = (text: string) => {
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const extractTranscriptFromContent = async (content: string) => {
    const videoIds = extractYouTubeId(content);
    const urls = detectYouTubeUrls(content);

    if (videoIds.length === 0) {
      toast({
        title: "No YouTube videos found",
        description: "Please paste a YouTube URL in your note content first.",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    setExtractedTranscript("");
    setVideoInfo(null);

    try {
      const videoId = videoIds[0];
      const url = urls[0];

      console.log("Starting transcript extraction with fallback for video:", videoId);

      // Use the TranscriptionService which has proper fallback logic
      const result = await TranscriptionService.transcribeWithFallback(url);

      if (result.success && result.text) {
        console.log('Transcript extraction successful:', result.provider);
        
        // Get video metadata
        const metadata = await TranscriptionService.getYouTubeMetadata(videoId);
        
        setExtractedTranscript(result.text);
        setVideoInfo(metadata);

        // Format the enhanced content
        const title = metadata?.title || `YouTube Video ${videoId}`;
        const author = metadata?.author || 'Unknown';
        const duration = metadata?.duration || 'Unknown';

        let enhancedContent = `# 🎥 ${title}\n\n`;
        enhancedContent += `**Source:** ${url}\n`;
        enhancedContent += `**Author:** ${author}\n`;
        enhancedContent += `**Duration:** ${duration}\n`;
        enhancedContent += `**Type:** Video Transcript\n`;
        enhancedContent += `**Extracted:** ${new Date().toLocaleString()}\n`;
        enhancedContent += `**Method:** ${result.provider || 'unknown'}\n\n`;
        enhancedContent += `---\n\n`;
        enhancedContent += `## 📝 Transcript\n\n`;
        enhancedContent += result.text;
        enhancedContent += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

        onTranscriptExtracted(enhancedContent);

        toast({
          title: "✅ Transcript Extracted Successfully!",
          description: `Successfully extracted transcript using ${result.provider || 'fallback method'}`
        });

      } else {
        // Handle extraction failure
        console.error("All transcript extraction methods failed:", result.error);
        
        // Show appropriate error message based on the error
        let errorTitle = "❌ Transcript Extraction Failed";
        let errorDescription = result.error || "Unable to extract transcript from this video.";
        
        if (result.error?.toLowerCase().includes('captions')) {
          errorTitle = "⚠️ No Captions Available";
          errorDescription = "This video doesn't have captions enabled by the creator.";
        } else if (result.error?.toLowerCase().includes('restricted') || result.error?.toLowerCase().includes('private')) {
          errorTitle = "🔒 Video Restricted";
          errorDescription = "This video is private, age-restricted, or region-locked.";
        } else if (result.error?.toLowerCase().includes('not found')) {
          errorTitle = "🔍 Video Not Found";
          errorDescription = "This video could not be found. It may have been deleted.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error("Unexpected error during transcript extraction:", error);
      
      toast({
        title: "❌ Unexpected Error",
        description: "An unexpected error occurred during transcript extraction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadTranscript = () => {
    if (!extractedTranscript) return;

    const content = `# ${videoInfo?.title || 'YouTube Video Transcript'}
Author: ${videoInfo?.author || 'Unknown'}
Duration: ${videoInfo?.duration || 'Unknown'}
Extracted: ${new Date().toLocaleString()}

## Transcript
${extractedTranscript}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Transcript downloaded",
      description: "Your transcript has been saved as a text file."
    });
  };

  const handleSpeechToText = (transcribedText: string) => {
    const enhancedContent = `# 🎤 Voice Note\n\n`;
    const timestamp = new Date().toLocaleString();
    
    let content = enhancedContent;
    content += `**Type:** Voice Transcription\n`;
    content += `**Recorded:** ${timestamp}\n`;
    content += `**Method:** Speech-to-Text AI (Supadata + Whisper Fallback)\n\n`;
    content += `---\n\n`;
    content += `## 📝 Transcription\n\n`;
    content += transcribedText;
    content += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

    onTranscriptExtracted(content);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Enhanced Transcript Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="speech" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Speech-to-Text
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="youtube" className="space-y-4 mt-4">
            <Button
              onClick={() => extractTranscriptFromContent(window.getSelection()?.toString() || document.body.innerText || "")}
              disabled={isExtracting}
              className="w-full"
              size="lg"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting transcript...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Extract Transcript from YouTube URL
                </>
              )}
            </Button>

            {extractedTranscript && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Transcript Preview
                  </span>
                  <Button
                    onClick={downloadTranscript}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                
                {videoInfo && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium text-sm truncate">{videoInfo.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      by {videoInfo.author} • {videoInfo.duration}
                    </p>
                  </div>
                )}

                <div className="max-h-32 overflow-y-auto p-3 bg-muted/20 rounded-lg border text-xs font-mono">
                  {extractedTranscript.split('\n').slice(0, 10).map((line, index) => (
                    <div key={index} className="mb-1">{line}</div>
                  ))}
                  {extractedTranscript.split('\n').length > 10 && (
                    <div className="text-muted-foreground italic">
                      ... and {extractedTranscript.split('\n').length - 10} more lines
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">How to use:</p>
                <p>Paste a YouTube URL in your note content, then click "Extract Transcript" to fetch the video's captions and add them to your note.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="speech" className="space-y-4 mt-4">
            <AudioRecorder 
              onTranscription={handleSpeechToText}
              className="w-full"
            />
            
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Mic className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-green-700 dark:text-green-300">
                <p className="font-medium mb-1">Enhanced Speech-to-Text:</p>
                <p>Uses Supadata AI for premium transcription quality, with OpenAI Whisper as fallback for maximum reliability.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Advanced AI Processing:</p>
            <p>Both transcript and speech features use multiple AI providers with intelligent fallbacks for maximum success rate.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
