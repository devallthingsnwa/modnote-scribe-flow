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
  const [hasWarning, setHasWarning] = useState(false);
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

  const formatTranscriptContent = (transcript: string, url: string, metadata: any) => {
    const videoId = TranscriptionService.extractVideoId(url);
    const title = metadata?.title || `YouTube Video ${videoId}`;
    const importDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let formattedContent = `# 🎥 ${title}\n\n`;
    formattedContent += `**Source:** ${url}\n`;
    formattedContent += `**Type:** Video Transcript\n`;
    formattedContent += `**Imported:** ${importDate}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 Transcript\n\n`;
    formattedContent += transcript;
    formattedContent += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;

    return formattedContent;
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
    setHasWarning(false);

    try {
      const videoId = videoIds[0];
      const url = urls[0];

      console.log("Starting transcript extraction for video:", videoId);

      // Get video metadata first with error handling
      let metadata = null;
      try {
        metadata = await TranscriptionService.getYouTubeMetadata(videoId);
      } catch (error) {
        console.warn('Failed to fetch video metadata:', error);
        metadata = { 
          title: `YouTube Video ${videoId}`, 
          author: 'Unknown', 
          duration: 'Unknown' 
        };
      }

      // Enhanced transcript extraction with proper error handling
      const result = await TranscriptionService.transcribeWithFallback(url);

      if (result.success && result.text) {
        console.log('Transcript extraction completed successfully');
        
        // Check if this is a meaningful transcript or fallback content
        const isActualTranscript = result.text.length > 200 && 
                                  !result.text.includes('could not be automatically') &&
                                  !result.text.includes('requires additional permissions');
        
        setHasWarning(!isActualTranscript);
        setExtractedTranscript(result.text);
        setVideoInfo(metadata);

        // Format the content properly
        const enhancedContent = formatTranscriptContent(result.text, url, metadata);
        onTranscriptExtracted(enhancedContent);

        if (isActualTranscript) {
          toast({
            title: "✅ Transcript Extracted Successfully!",
            description: `Successfully extracted transcript with ${result.text.length} characters`
          });
        } else {
          toast({
            title: "⚠️ Limited Content Available",
            description: "Transcript extraction had limitations - note created for manual input"
          });
        }

      } else {
        // Handle extraction failure gracefully
        console.error("Transcript extraction failed:", result.error);
        
        // Create a fallback note even if extraction fails
        const fallbackContent = formatTranscriptContent(
          "Transcript extraction was not successful. You can manually add your notes and observations about this video.",
          url,
          metadata
        );
        
        onTranscriptExtracted(fallbackContent);
        setHasWarning(true);
        
        toast({
          title: "⚠️ Transcript Unavailable",
          description: "Created note template for manual input",
        });
      }

    } catch (error) {
      console.error("Unexpected error during transcript extraction:", error);
      
      // Create an error note with helpful guidance
      const videoId = videoIds[0];
      const url = urls[0];
      const errorContent = formatTranscriptContent(
        `Transcript extraction encountered an error: ${error.message}\n\nYou can:\n1. Try again later\n2. Check if the video has captions available\n3. Add your own notes about the video content`,
        url,
        { title: `YouTube Video ${videoId}`, author: 'Unknown', duration: 'Unknown' }
      );
      
      onTranscriptExtracted(errorContent);
      setHasWarning(true);
      
      toast({
        title: "❌ Extraction Error",
        description: "Created note template - you can add manual notes",
        variant: "default"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadTranscript = () => {
    if (!extractedTranscript) return;

    const content = `# ${videoInfo?.title || 'YouTube Video Transcript'}
Source: ${videoInfo?.url || 'Unknown'}
Type: Video ${hasWarning ? 'Note' : 'Transcript'}
Imported: ${new Date().toLocaleString()}
${hasWarning ? 'Status: ⚠️ Transcript unavailable - manual notes only' : ''}

---

## ${hasWarning ? 'Notes' : 'Transcript'}
${extractedTranscript}

---

## My Notes
Add your personal notes and thoughts here...
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hasWarning ? 'notes' : 'transcript'}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: `${hasWarning ? 'Notes' : 'Transcript'} downloaded`,
      description: `Your ${hasWarning ? 'notes' : 'transcript'} has been saved as a text file.`
    });
  };

  const handleSpeechToText = (transcribedText: string) => {
    const timestamp = new Date().toLocaleString();
    
    let content = `# 🎤 Voice Note\n\n`;
    content += `**Type:** Voice Transcription\n`;
    content += `**Imported:** ${timestamp}\n`;
    content += `**Method:** Speech-to-Text AI (Supadata + Whisper Fallback)\n\n`;
    content += `---\n\n`;
    content += `## 📝 Transcription\n\n`;
    content += transcribedText;
    content += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;

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
                    {hasWarning ? 'Video Note Preview' : 'Transcript Preview'}
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
                  <div className={`p-3 rounded-lg border ${hasWarning ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-muted/50'}`}>
                    <h4 className="font-medium text-sm truncate">{videoInfo.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      by {videoInfo.author} • {videoInfo.duration}
                    </p>
                    {hasWarning && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        ⚠️ Transcript extraction had limitations
                      </p>
                    )}
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
                <p>Paste a YouTube URL in your note content, then click "Extract Transcript" to fetch the video's captions and add them to your note with proper formatting.</p>
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
            <p className="font-medium mb-1">Enhanced Extraction System:</p>
            <p>Uses multiple methods to extract transcript content. When successful, returns the raw transcript text formatted in your note.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
