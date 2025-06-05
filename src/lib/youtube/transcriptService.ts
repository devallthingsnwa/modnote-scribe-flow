
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

    console.log(`🚀 Starting enhanced transcript extraction for video: ${videoId}`);

    try {
      const result = await SupadataService.processWithFallbackChain(videoId);
      
      let metadata = result.metadata;
      if (!metadata) {
        metadata = await this.fetchVideoMetadata(videoId);
      }

      if (result.success && result.transcript && result.transcript.trim().length > 20) {
        const source = this.mapMethodToSource(result.method || 'unknown');
        console.log(`✅ Transcript extraction successful via ${source}: ${result.transcript.length} characters`);
        
        return {
          success: true,
          transcript: result.transcript.trim(),
          segments: result.segments,
          metadata,
          source,
          method: result.method
        };
      }

      console.log(`⚠️ Transcript extraction failed or returned insufficient content`);
      return {
        success: false,
        error: result.error || 'Unable to extract transcript. This video may not have captions available or may be restricted.',
        metadata,
        source: 'fallback',
        retryable: result.retryable !== false
      };

    } catch (error) {
      console.error('❌ Transcript extraction failed:', error);
      
      const metadata = await this.fetchVideoMetadata(videoId);
      return {
        success: false,
        error: error.message || 'Failed to extract transcript. Please check if the video is public and has captions available.',
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
      console.log(`🔄 Enhanced transcript extraction attempt ${attempt + 1}/${maxRetries}`);
      
      const result = await this.extractTranscriptWithFallback(videoUrl);
      
      if (result.success && result.transcript && result.transcript.trim().length > 20) {
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 3000; // Shorter delays for better UX
        console.log(`⏳ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return lastResult || {
      success: false,
      error: 'All extraction attempts failed. This video may not have captions available or may be restricted.',
      source: 'fallback',
      retryable: false
    };
  }

  private static mapMethodToSource(method: string): 'captions' | 'audio-transcription' | 'external' | 'fallback' {
    switch (method) {
      case 'captions':
      case 'direct-captions':
      case 'page-scraping': return 'captions';
      case 'audio-transcription': return 'audio-transcription';
      case 'podsqueeze':
      case 'whisper':
      case 'riverside': return 'external';
      default: return 'fallback';
    }
  }
}
