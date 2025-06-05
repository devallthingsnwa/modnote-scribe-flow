
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

  static async extractTranscriptWithFallback(videoUrl: string): Promise<TranscriptResult> {
    const videoId = VideoUtils.extractVideoId(videoUrl);
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube URL format',
        source: 'fallback'
      };
    }

    console.log(`🚀 Starting transcript extraction for video: ${videoId}`);

    try {
      const result = await SupadataService.processWithFallbackChain(videoId);
      
      let metadata = result.metadata;
      if (!metadata) {
        metadata = await this.fetchVideoMetadata(videoId);
      }

      if (result.success && result.transcript) {
        const source = this.mapMethodToSource(result.method || 'unknown');
        console.log(`✅ Transcript extraction successful via ${source}`);
        
        // Return raw transcript as-is
        return {
          success: true,
          transcript: result.transcript,
          segments: result.segments,
          metadata,
          source,
          method: result.method
        };
      }

      console.log(`⚠️ Transcript extraction failed`);
      return {
        success: false,
        error: result.error || 'All transcription methods failed',
        metadata,
        source: 'fallback',
        retryable: result.retryable
      };

    } catch (error) {
      console.error('❌ Transcript extraction failed:', error);
      
      const metadata = await this.fetchVideoMetadata(videoId);
      return {
        success: false,
        error: error.message || 'Failed to extract transcript',
        metadata,
        source: 'fallback',
        retryable: true
      };
    }
  }

  static async extractTranscript(videoUrl: string): Promise<TranscriptResult> {
    return this.extractTranscriptWithFallback(videoUrl);
  }

  static async processVideoWithRetry(videoUrl: string, maxRetries: number = 3): Promise<TranscriptResult> {
    let lastResult: TranscriptResult | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`🔄 Transcript extraction attempt ${attempt + 1}/${maxRetries}`);
      
      const result = await this.extractTranscriptWithFallback(videoUrl);
      
      if (result.success || !result.retryable) {
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 5000;
        console.log(`⏳ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return lastResult || {
      success: false,
      error: 'All extraction attempts failed',
      source: 'fallback',
      retryable: false
    };
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
