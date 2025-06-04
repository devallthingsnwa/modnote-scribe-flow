
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Play, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionService } from "@/lib/transcriptionService";

interface YouTubeTabProps {
  onTranscriptExtracted: (content: string) => void;
  isExtracting: boolean;
  setIsExtracting: (extracting: boolean) => void;
  setExtractedTranscript: (transcript: string) => void;
  setVideoInfo: (info: any) => void;
  setHasWarning: (warning: boolean) => void;
}

export function YouTubeTab({
  onTranscriptExtracted,
  isExtracting,
  setIsExtracting,
  setExtractedTranscript,
  setVideoInfo,
  setHasWarning
}: YouTubeTabProps) {
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
    setHasWarning(false);

    try {
      const videoId = videoIds[0];
      const url = urls[0];

      console.log("Starting transcript extraction with fallback for video:", videoId);

      const result = await TranscriptionService.transcribeWithFallback(url);

      if (result.success && result.text) {
        console.log('Transcript extraction completed:', result.provider);
        
        const isWarning = result.metadata?.isWarning || result.provider === 'warning-fallback';
        setHasWarning(isWarning);
        
        let metadata = null;
        try {
          metadata = await TranscriptionService.getYouTubeMetadata(videoId);
        } catch (error) {
          console.warn('Failed to fetch video metadata:', error);
        }
        
        setExtractedTranscript(result.text);
        setVideoInfo(metadata);

        const title = metadata?.title || `YouTube Video ${videoId}`;
        const author = metadata?.author || 'Unknown';
        const duration = metadata?.duration || 'Unknown';

        let enhancedContent = `# 🎥 ${title}\n\n`;
        enhancedContent += `**Source:** ${url}\n`;
        enhancedContent += `**Author:** ${author}\n`;
        enhancedContent += `**Duration:** ${duration}\n`;
        enhancedContent += `**Type:** Video ${isWarning ? 'Note' : 'Transcript'}\n`;
        enhancedContent += `**Extracted:** ${new Date().toLocaleString()}\n`;
        enhancedContent += `**Method:** ${result.provider || 'unknown'}\n`;
        if (isWarning) {
          enhancedContent += `**Status:** ⚠️ Transcript unavailable - manual notes only\n`;
        }
        enhancedContent += `\n---\n\n`;
        enhancedContent += `## 📝 ${isWarning ? 'Notes' : 'Transcript'}\n\n`;
        enhancedContent += result.text;
        if (!isWarning) {
          enhancedContent += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;
        }

        onTranscriptExtracted(enhancedContent);

        if (isWarning) {
          toast({
            title: "⚠️ Video Saved with Warning",
            description: "Transcript unavailable but note created for manual input"
          });
        } else {
          toast({
            title: "✅ Transcript Extracted Successfully!",
            description: `Successfully extracted transcript using ${result.provider || 'fallback method'}`
          });
        }

      } else {
        console.error("Unexpected: TranscriptionService returned failure");
        
        toast({
          title: "❌ Unexpected Error",
          description: "An unexpected error occurred. Please try again.",
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

  return (
    <div className="space-y-4 mt-4">
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

      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">How to use:</p>
          <p>Paste a YouTube URL in your note content, then click "Extract Transcript" to fetch the video's captions and add them to your note. If transcript isn't available, a note will still be created with a warning.</p>
        </div>
      </div>
    </div>
  );
}
