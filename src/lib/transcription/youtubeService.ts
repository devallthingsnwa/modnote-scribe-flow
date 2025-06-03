
import { supabase } from "@/integrations/supabase/client";
import { TranscriptFormatter, VideoMetadata, TranscriptData } from "./formatters";

export interface YouTubeTranscriptResult {
  success: boolean;
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    duration?: string;
    extractionMethod?: string;
  };
  error?: string;
}

export class YouTubeService {
  static extractVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  static async fetchYouTubeTranscript(url: string, retryAttempt = 0): Promise<YouTubeTranscriptResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`Fetching transcript for video ${videoId} (attempt ${retryAttempt + 1})`);

      const { data, error } = await supabase.functions.invoke('fetch-youtube-transcript', {
        body: { 
          videoId,
          options: {
            includeTimestamps: true,
            language: 'en',
            maxRetries: 2
          }
        }
      });

      if (error) {
        console.error("Transcript fetch error:", error);
        throw new Error(`Failed to fetch transcript: ${error.message}`);
      }

      if (!data) {
        throw new Error("No response received from transcript service");
      }

      // Extract transcript text and clean it
      let transcriptText = '';
      if (data.transcript && typeof data.transcript === 'string') {
        transcriptText = data.transcript.trim();
      }

      if (!transcriptText || transcriptText.length < 20) {
        throw new Error("Transcript content is empty or too short");
      }

      // Get video metadata
      const metadata = await this.getYouTubeMetadata(videoId);

      // Format the enhanced transcript
      const formattedTranscript = TranscriptFormatter.formatEnhancedTranscript(
        {
          title: metadata.title,
          author: metadata.author,
          duration: metadata.duration,
          url: url
        },
        { text: transcriptText }
      );

      return {
        success: true,
        text: formattedTranscript,
        metadata: {
          title: metadata.title,
          author: metadata.author,
          duration: metadata.duration,
          extractionMethod: data.metadata?.extractionMethod || 'youtube-transcript'
        }
      };

    } catch (error) {
      console.error("YouTube transcript fetch failed:", error);
      
      // Return formatted fallback
      const fallbackContent = TranscriptFormatter.formatFallbackNote(url, this.extractVideoId(url));
      
      return {
        success: true, // Still return success for consistent handling
        text: fallbackContent,
        error: error.message,
        metadata: {
          extractionMethod: 'fallback',
          title: 'Unknown',
          author: 'Unknown',
          duration: 'Unknown'
        }
      };
    }
  }

  static async getYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
    try {
      // Try YouTube oEmbed API first
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        return {
          title: oembedData.title || `YouTube Video ${videoId}`,
          author: oembedData.author_name || 'Unknown',
          duration: 'Unknown', // oEmbed doesn't provide duration
          url: `https://youtu.be/${videoId}`
        };
      }
    } catch (error) {
      console.warn('Failed to fetch metadata from oEmbed:', error);
    }

    // Fallback metadata
    return {
      title: `YouTube Video ${videoId}`,
      author: 'Unknown',
      duration: 'Unknown',
      url: `https://youtu.be/${videoId}`
    };
  }
}
