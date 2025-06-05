import { supabase } from "@/integrations/supabase/client";
import { TranscriptResult, VideoMetadata } from "./types";
import { SupadataService } from "./supadata";
import { VideoUtils } from "./videoUtils";

export class YouTubeTranscriptService {
  static async fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      console.log(`📊 Fetching metadata for video: ${videoId}`);
      
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        return {
          videoId,
          title: oembedData.title,
          channel: oembedData.author_name,
          duration: 'Unknown',
          thumbnail: VideoUtils.generateThumbnailUrl(videoId),
          description: ''
        };
      }

      return {
        videoId,
        title: `YouTube Video ${videoId}`,
        channel: 'Unknown',
        duration: 'Unknown',
        thumbnail: VideoUtils.generateThumbnailUrl(videoId)
      };
    } catch (error) {
      console.warn('Failed to fetch video metadata:', error);
      return {
        videoId,
        title: `YouTube Video ${videoId}`,
        channel: 'Unknown',
        duration: 'Unknown',
        thumbnail: VideoUtils.generateThumbnailUrl(videoId)
      };
    }
  }

  static async extractTranscriptWithEnhancedRetry(videoUrl: string): Promise<TranscriptResult> {
    const videoId = VideoUtils.extractVideoId(videoUrl);
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube URL format',
        source: 'fallback'
      };
    }

    console.log(`🚀 Starting enhanced transcript extraction for video: ${videoId}`);

    // Enhanced retry configuration - more aggressive attempts
    const maxAttempts = 5;
    const retryDelays = [2000, 5000, 10000, 15000, 20000]; // Progressive backoff
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`🔄 Enhanced extraction attempt ${attempt + 1}/${maxAttempts}`);
      
      try {
        // Use the comprehensive fallback chain
        const result = await SupadataService.processWithEnhancedFallbackChain(videoId, attempt);
        
        // Fetch metadata if not included
        let metadata = result.metadata;
        if (!metadata) {
          metadata = await this.fetchVideoMetadata(videoId);
        }

        if (result.success && result.transcript) {
          const source = this.mapMethodToSource(result.method || 'unknown');
          console.log(`✅ Enhanced extraction successful via ${source} on attempt ${attempt + 1}`);
          
          return {
            success: true,
            transcript: result.transcript,
            segments: result.segments,
            metadata,
            source,
            method: result.method
          };
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxAttempts - 1) {
          const delay = retryDelays[attempt];
          console.log(`⏳ Attempt ${attempt + 1} failed, waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1} failed with error:`, error);
        
        // If this isn't the last attempt, continue to next attempt
        if (attempt < maxAttempts - 1) {
          const delay = retryDelays[attempt];
          console.log(`⏳ Error on attempt ${attempt + 1}, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // If all attempts failed, create fallback note with metadata
    console.log(`📋 All ${maxAttempts} extraction attempts failed, creating fallback note...`);
    const metadata = await this.fetchVideoMetadata(videoId);
    
    return {
      success: false,
      error: `All ${maxAttempts} extraction attempts failed`,
      metadata,
      source: 'fallback',
      retryable: false
    };
  }

  static async extractTranscriptWithFallback(videoUrl: string): Promise<TranscriptResult> {
    // Use the enhanced retry system by default
    return this.extractTranscriptWithEnhancedRetry(videoUrl);
  }

  static async extractTranscript(videoUrl: string): Promise<TranscriptResult> {
    // Use the enhanced retry system by default
    return this.extractTranscriptWithEnhancedRetry(videoUrl);
  }

  static async processVideoWithRetry(videoUrl: string, maxRetries: number = 5): Promise<TranscriptResult> {
    // Use the enhanced retry system which already has comprehensive retry logic
    return this.extractTranscriptWithEnhancedRetry(videoUrl);
  }

  private static mapMethodToSource(method: string): 'captions' | 'audio-transcription' | 'external' | 'fallback' {
    switch (method) {
      case 'captions': return 'captions';
      case 'audio-transcription': return 'audio-transcription';
      case 'podsqueeze':
      case 'whisper':
      case 'riverside': return 'external';
      default: return 'fallback';
    }
  }
}
