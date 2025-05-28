import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TranscriptionConfig {
  provider: 'podsqueeze' | 'whisper' | 'riverside';
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

  private static async fetchYouTubeTranscript(url: string): Promise<TranscriptionResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`Fetching YouTube transcript for video ID: ${videoId} (using Supadata API)`);
      
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
        throw error;
      }

      if (data?.transcript) {
        return {
          success: true,
          text: data.transcript,
          metadata: data.metadata,
          provider: data.metadata?.extractionMethod || 'youtube-transcript'
        };
      } else {
        // Show warning for no transcript available
        toast({
          title: "⚠️ Transcript Not Available",
          description: "This video doesn't have captions or transcripts available. The video creator may not have enabled captions.",
          variant: "destructive",
        });
        
        throw new Error('No transcript available - video may not have captions enabled');
      }
    } catch (error) {
      console.error('YouTube transcript fetch failed:', error);
      
      // Show specific warning for transcript unavailability
      if (error.message?.includes('no captions') || error.message?.includes('not available')) {
        toast({
          title: "⚠️ Transcript Unavailable",
          description: "This YouTube video doesn't have transcripts or captions available. Try a different video with captions enabled.",
          variant: "destructive",
        });
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
    
    // For YouTube videos, try YouTube transcript first (now with Supadata)
    if (mediaType === 'youtube') {
      console.log('Attempting YouTube transcript extraction with Supadata API...');
      const youtubeResult = await this.fetchYouTubeTranscript(url);
      
      if (youtubeResult.success) {
        console.log('YouTube transcript extraction successful via Supadata');
        return youtubeResult;
      }
      
      console.warn('YouTube transcript failed, trying external providers...');
      
      // Show warning that transcript extraction failed
      toast({
        title: "⚠️ Transcript Extraction Failed",
        description: "Unable to extract transcript from this YouTube video. Trying alternative transcription methods...",
        variant: "destructive",
      });
    }
    
    // Try external transcription providers in priority order
    const providers = ['podsqueeze', 'whisper', 'riverside'];
    
    for (const provider of providers) {
      console.log(`Attempting transcription with ${provider}...`);
      
      const result = await this.callTranscriptionAPI(provider, url);
      
      if (result.success) {
        console.log(`Transcription successful with ${provider}`);
        return result;
      }
      
      console.warn(`${provider} failed, trying next provider...`);
    }

    // If all providers fail, show final warning
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
    // YouTube URL patterns
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
