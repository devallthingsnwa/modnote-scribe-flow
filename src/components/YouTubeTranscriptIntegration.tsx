
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoNoteProcessor } from "@/lib/videoNoteProcessor";

interface YouTubeTranscriptIntegrationProps {
  onTranscriptExtracted: (content: string) => void;
  className?: string;
}

export function YouTubeTranscriptIntegration({ 
  onTranscriptExtracted, 
  className 
}: YouTubeTranscriptIntegrationProps) {
  const [isExtracting, setIsExtracting] = useState(false);
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
    
    // Check if it's an error message
    const errorMessages = [
      'You can add your own notes here',
      'Transcript not available',
      'No transcript available',
      'Unable to fetch transcript',
      'Error fetching transcript',
      'could not be fetched',
      'Please try again later',
      'All extraction methods failed',
      'captions available or may be restricted',
      'technical error'
    ];
    
    const hasErrorMessage = errorMessages.some(msg => 
      trimmed.toLowerCase().includes(msg.toLowerCase())
    );
    
    // Require minimum length and proper formatting for valid transcripts
    const hasTimestamps = trimmed.includes('[') && trimmed.includes(']');
    const hasMultipleLines = trimmed.split('\n').length > 3;
    const hasMinimumLength = trimmed.length > 200; // Increased minimum length
    
    return !hasErrorMessage && (hasTimestamps || hasMultipleLines) && hasMinimumLength;
  };

  const extractTranscriptFromContent = async (content: string) => {
    const videoIds = extractYouTubeId(content);
    const urls = detectYouTubeUrls(content);

    if (videoIds.length === 0) {
      toast({
        title: "No YouTube videos found",
        description: "Please paste a YouTube URL in your note content first.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      // Process the first YouTube video found
      const videoId = videoIds[0];
      const url = urls[0];

      console.log("Extracting transcript for video:", videoId);

      const result = await VideoNoteProcessor.processVideo(videoId, {
        fetchMetadata: true,
        fetchTranscript: true,
        generateSummary: false,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to extract transcript");
      }

      // Validate the transcript content
      if (!result.transcript || !isValidTranscript(result.transcript)) {
        throw new Error("No valid transcript available for this video. The video may not have captions enabled or may be restricted.");
      }

      // Format the enhanced content
      const title = result.metadata?.title || `YouTube Video ${videoId}`;
      const author = result.metadata?.author || 'Unknown';
      const duration = result.metadata?.duration || 'Unknown';
      
      let enhancedContent = `# 🎥 ${title}\n\n`;
      enhancedContent += `**Source:** ${url}\n`;
      enhancedContent += `**Author:** ${author}\n`;
      enhancedContent += `**Duration:** ${duration}\n`;
      enhancedContent += `**Type:** Video Transcript\n`;
      enhancedContent += `**Extracted:** ${new Date().toLocaleString()}\n\n`;
      enhancedContent += `---\n\n`;
      enhancedContent += `## 📝 Transcript\n\n`;
      enhancedContent += result.transcript;
      enhancedContent += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

      onTranscriptExtracted(enhancedContent);

      toast({
        title: "Transcript extracted!",
        description: `Successfully extracted transcript for "${title}"`,
      });

    } catch (error) {
      console.error("Transcript extraction error:", error);
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract transcript. This video may not have captions available or may be restricted.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium">YouTube Transcript Extraction</p>
              <p className="text-xs text-muted-foreground">
                Paste a YouTube URL in your note, then click extract
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              // This will be called with the current note content
              const noteContent = document.querySelector('textarea')?.value || '';
              extractTranscriptFromContent(noteContent);
            }}
            disabled={isExtracting}
            size="sm"
            className="bg-red-600 hover:bg-red-700"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Extracting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Extract Transcript
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
