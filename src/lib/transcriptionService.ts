import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TranscriptionConfig {
  provider: 'podsqueeze' | 'whisper' | 'riverside' | 'supadata';
  apiKey?: string;
  enabled: boolean;
  priority: number;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  metadata?: {
    title?: string;
    duration?: number;
    speaker_segments?: Array<{
      speaker: string;
      start: number;
      end: number;
      text: string;
    }>;
    credits?: number;
    availableLanguages?: string[];
    extractionMethod?: string;
    apiAttempt?: string;
  };
  error?: string;
  provider?: string;
}

export class TranscriptionService {
  private static async callTranscriptionAPI(
    provider: string,
    url: string,
    options?: any
  ): Promise<TranscriptionResult> {
    try {
      const { data, error } = await supabase.functions.invoke('multimedia-transcription', {
        body: { 
          provider,
          url,
          options: {
            include_metadata: true,
            include_timestamps: true,
            ...options
          }
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        text: data.transcription,
        metadata: data.metadata,
        provider
      };
    } catch (error) {
      console.error(`${provider} transcription failed:`, error);
      return {
        success: false,
        error: error.message || `${provider} transcription failed`,
        provider
      };
    }
  }

  private static async fetchYouTubeTranscript(url: string, retryCount: number = 0): Promise<TranscriptionResult> {
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

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = this.detectMediaType(url);
    
    // For YouTube videos, use enhanced extraction with Supadata priority
    if (mediaType === 'youtube') {
      console.log('Starting enhanced YouTube transcript extraction with Supadata priority...');
      
      const youtubeResult = await this.fetchYouTubeTranscript(url);
      
      if (youtubeResult.success) {
        const extractionMethod = youtubeResult.metadata?.extractionMethod || youtubeResult.provider;
        console.log('YouTube transcript extraction successful via:', extractionMethod);
        
        // Enhanced success notification
        let successMessage = `Successfully extracted transcript`;
        if (extractionMethod === 'supadata-api') {
          successMessage += ' using Supadata API';
          if (youtubeResult.metadata?.apiAttempt) {
            successMessage += ` (${youtubeResult.metadata.apiAttempt})`;
          }
        } else {
          successMessage += ` using ${extractionMethod}`;
        }
        
        toast({
          title: "✅ Transcript Extracted Successfully!",
          description: successMessage
        });
        
        return youtubeResult;
      }
      
      console.warn('Enhanced YouTube transcript extraction failed, trying external providers...');
      
      // Enhanced error handling
      let errorDetails = youtubeResult.error || 'Unknown error';
      if (errorDetails.includes('captions')) {
        toast({
          title: "⚠️ No Captions Available",
          description: "This video doesn't have captions enabled. Trying alternative providers...",
          variant: "destructive",
        });
      } else if (errorDetails.includes('private') || errorDetails.includes('restricted')) {
        toast({
          title: "🔒 Video Restricted",
          description: "This video is private or restricted. Trying alternative providers...",
          variant: "destructive",
        });
      }
    }
    
    // Try external transcription providers as final fallback
    const providers = ['podsqueeze', 'whisper', 'riverside'];
    
    for (const provider of providers) {
      console.log(`Attempting transcription with ${provider}...`);
      
      const result = await this.callTranscriptionAPI(provider, url);
      
      if (result.success) {
        console.log(`Transcription successful with ${provider}`);
        
        toast({
          title: "✅ Transcript Extracted Successfully!",
          description: `Successfully extracted transcript using ${provider}`
        });
        
        return result;
      }
      
      console.warn(`${provider} failed, trying next provider...`);
    }

    // If all providers fail
    toast({
      title: "❌ Transcription Failed",
      description: "All transcription methods failed. This content may not support automatic transcription or may be restricted.",
      variant: "destructive",
    });

    return {
      success: false,
      error: 'All transcription providers failed. Please try again later or use a different video.'
    };
  }

  static async getYouTubeMetadata(videoId: string): Promise<{
    title?: string;
    thumbnail?: string;
    duration?: string;
    author?: string;
    description?: string;
  }> {
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

  static detectMediaType(url: string): 'youtube' | 'podcast' | 'audio' | 'video' | 'unknown' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('podcast') || url.includes('anchor.fm') || url.includes('spotify.com/episode')) {
      return 'podcast';
    }
    if (url.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      return 'audio';
    }
    if (url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return 'video';
    }
    return 'unknown';
  }
}
