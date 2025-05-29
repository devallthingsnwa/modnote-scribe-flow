import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult, YouTubeMetadata } from "./types";
import { YouTubeAudioService } from "./youtubeAudioService";

export class YouTubeService {
  static async fetchYouTubeTranscript(url: string, retryCount: number = 0): Promise<TranscriptionResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`Fetching YouTube transcript for video ID: ${videoId} (attempt ${retryCount + 1}/3)`);
      
      const { data, error } = await supabase.functions.invoke('fetch-youtube-transcript', {
        body: { 
          videoId,
          options: {
            includeTimestamps: true,
            language: 'en',
            format: 'text'
          }
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      // Enhanced response validation
      if (data?.success && data?.transcript) {
        const transcriptLength = data.transcript.length;
        console.log(`Transcript extraction successful: ${transcriptLength} characters via ${data.metadata?.extractionMethod}`);
        
        // Validate transcript quality
        if (transcriptLength < 10) {
          throw new Error('Transcript too short - likely incomplete or invalid');
        }

        // Check for error indicators in transcript text
        const transcript = data.transcript.toLowerCase();
        if (transcript.includes('unable to fetch') || 
            transcript.includes('technical error') || 
            transcript.includes('no transcript available')) {
          throw new Error('Transcript extraction indicated failure');
        }

        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            credits: data.metadata?.credits,
            availableLanguages: data.metadata?.availableLanguages,
            extractionMethod: data.metadata?.extractionMethod,
            apiAttempt: data.metadata?.apiAttempt
          },
          provider: data.metadata?.extractionMethod || 'youtube-transcript'
        };
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No transcript data received from extraction service');
      }
    } catch (error) {
      console.error(`YouTube transcript fetch failed (attempt ${retryCount + 1}):`, error);
      
      // If transcript extraction fails, try audio extraction with Supadata
      if (retryCount === 0) {
        console.log('Transcript extraction failed, trying audio extraction with Supadata...');
        const videoId = this.extractVideoId(url);
        if (videoId) {
          const audioResult = await YouTubeAudioService.extractAudioAndTranscribe(videoId);
          if (audioResult.success) {
            return audioResult;
          }
          console.warn('Audio extraction also failed, continuing with retry logic...');
        }
      }
      
      // Retry logic for transient failures
      if (retryCount < 2 && 
          (error.message?.includes('network') || 
           error.message?.includes('timeout') || 
           error.message?.includes('rate limit'))) {
        console.log(`Retrying transcript extraction in ${(retryCount + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return this.fetchYouTubeTranscript(url, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message || 'YouTube transcript fetch failed',
        provider: 'youtube-transcript'
      };
    }
  }

  static async getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-metadata', {
        body: { videoId }
      });

      if (error) {
        throw error;
      }

      return {
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        author: data.author,
        description: data.description
      };
    } catch (error) {
      console.error('Failed to fetch YouTube metadata:', error);
      return {};
    }
  }

  static extractVideoId(url: string): string | null {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
  }
}
