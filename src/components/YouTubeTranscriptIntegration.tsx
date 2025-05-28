import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Loader2, Download, Play, AlertCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  const isValidTranscript = (transcript: string): boolean => {
    if (!transcript || typeof transcript !== 'string') return false;
    const trimmed = transcript.trim();

    // Check if it's an error message or placeholder
    const errorIndicators = [
      'You can add your own notes here',
      'Transcript not available',
      'No transcript available',
      'Unable to fetch transcript',
      'Error fetching transcript',
      'could not be fetched',
      'Please try again later',
      'All extraction methods failed',
      'captions available or may be restricted',
      'technical error',
      'No valid transcript available',
      'video may not have captions',
      'Extraction failed'
    ];
    
    const hasErrorMessage = errorIndicators.some(msg => 
      trimmed.toLowerCase().includes(msg.toLowerCase())
    );

    if (hasErrorMessage) return false;

    // More lenient validation - accept shorter transcripts
    const hasMinimumLength = trimmed.length > 50; // Reduced from 200
    const hasTimestamps = trimmed.includes('[') && trimmed.includes(']');
    const hasMultipleLines = trimmed.split('\n').length > 1; // Reduced from 3
    const hasValidContent = !trimmed.toLowerCase().includes('undefined') && 
                           !trimmed.toLowerCase().includes('null') &&
                           trimmed.length > 20;

    return hasMinimumLength && hasValidContent && (hasTimestamps || hasMultipleLines);
  };

  const fetchVideoMetadata = async (videoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-metadata', {
        body: { videoId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Failed to fetch video metadata:', error);
      return null;
    }
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

      console.log("Extracting transcript for video:", videoId);

      // Fetch video metadata and transcript in parallel
      const [metadataResult, transcriptResult] = await Promise.all([
        fetchVideoMetadata(videoId),
        supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              includeTimestamps: true,
              language: 'en',
              maxRetries: 3 // Increased retries
            }
          }
        })
      ]);

      if (transcriptResult.error) {
        console.error('Transcript extraction error:', transcriptResult.error);
        throw new Error(transcriptResult.error.message || "Failed to fetch transcript");
      }

      const transcript = transcriptResult.data?.transcript;
      console.log('Raw transcript received:', transcript ? transcript.substring(0, 200) + '...' : 'null');

      // Enhanced error handling for different failure cases
      if (!transcript) {
        toast({
          title: "⚠️ No Transcript Data",
          description: "The transcript service returned empty data. This video may not have captions available.",
          variant: "destructive"
        });
        throw new Error("No transcript data received from the service");
      }

      if (!isValidTranscript(transcript)) {
        // Check what type of error we got
        if (transcript.toLowerCase().includes('captions') || 
            transcript.toLowerCase().includes('not available') ||
            transcript.toLowerCase().includes('restricted')) {
          toast({
            title: "⚠️ Captions Not Available",
            description: "This video doesn't have captions enabled by the creator, or the video may be age-restricted/private.",
            variant: "destructive"
          });
        } else if (transcript.toLowerCase().includes('failed') || 
                   transcript.toLowerCase().includes('error')) {
          toast({
            title: "❌ Extraction Failed",
            description: "The transcript extraction failed due to a technical issue. Please try again or use a different video.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "⚠️ Invalid Transcript",
            description: "The transcript data received appears to be invalid or corrupted. Please try a different video.",
            variant: "destructive"
          });
        }
        
        throw new Error("Invalid or empty transcript content received");
      }

      // Successfully extracted valid transcript
      setExtractedTranscript(transcript);
      setVideoInfo(metadataResult);

      // Format the enhanced content
      const title = metadataResult?.title || `YouTube Video ${videoId}`;
      const author = metadataResult?.author || 'Unknown';
      const duration = metadataResult?.duration || 'Unknown';

      let enhancedContent = `# 🎥 ${title}\n\n`;
      enhancedContent += `**Source:** ${url}\n`;
      enhancedContent += `**Author:** ${author}\n`;
      enhancedContent += `**Duration:** ${duration}\n`;
      enhancedContent += `**Type:** Video Transcript\n`;
      enhancedContent += `**Extracted:** ${new Date().toLocaleString()}\n\n`;
      enhancedContent += `---\n\n`;
      enhancedContent += `## 📝 Transcript\n\n`;
      enhancedContent += transcript;
      enhancedContent += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

      onTranscriptExtracted(enhancedContent);

      toast({
        title: "✅ Transcript Extracted Successfully!",
        description: `Successfully extracted transcript for "${title}"`
      });

    } catch (error) {
      console.error("Transcript extraction error:", error);
      
      // Don't show duplicate toast if we already showed one above
      if (!error.message?.includes('Invalid or empty transcript') && 
          !error.message?.includes('No transcript data received')) {
        let errorTitle = "❌ Extraction Failed";
        let errorDescription = error.message || "Failed to extract transcript.";
        
        if (error.message?.includes('private') || error.message?.includes('restricted')) {
          errorTitle = "🔒 Video Restricted";
          errorDescription = "This video is private, age-restricted, or region-locked and cannot be processed.";
        } else if (error.message?.includes('not found')) {
          errorTitle = "🔍 Video Not Found";
          errorDescription = "This video could not be found. It may have been deleted or made private.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive"
        });
      }
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          YouTube Transcript Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Note:</p>
            <p>Not all YouTube videos have transcripts available. If extraction fails, the video creator may not have enabled captions or the video may be restricted.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">How to use:</p>
            <p>Paste a YouTube URL in your note content, then click "Extract Transcript" to fetch the video's captions and add them to your note.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
