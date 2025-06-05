
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
      // Use enhanced fallback chain with raw transcript output
      const result = await SupadataService.processWithFallbackChain(videoId);
      
      // Fetch metadata separately if not included
      let metadata = result.metadata;
      if (!metadata) {
        metadata = await this.fetchVideoMetadata(videoId);
      }

      if (result.success && result.transcript) {
        const source = this.mapMethodToSource(result.method || 'unknown');
        console.log(`✅ Enhanced transcript extraction successful via ${source}`);
        
        // Clean transcript to return only raw spoken words
        const cleanTranscript = this.cleanToRawSpokenWords(result.transcript);
        
        return {
          success: true,
          transcript: cleanTranscript,
          segments: result.segments,
          metadata,
          source,
          method: result.method
        };
      }

      // Even if extraction failed, we should have a fallback note
      console.log(`⚠️ Enhanced transcript extraction completed with fallback`);
      return {
        success: false,
        error: result.error || 'All transcription methods failed',
        metadata,
        source: 'fallback',
        retryable: result.retryable
      };

    } catch (error) {
      console.error('❌ Enhanced transcript extraction failed:', error);
      
      // Create a basic fallback note even on complete failure
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

  static cleanToRawSpokenWords(transcript: string): string {
    // Return only raw spoken words, preserving original sequence
    return transcript
      .replace(/^\s*#.*$/gm, '') // Remove headings
      .replace(/^\s*\*\*.*?\*\*.*$/gm, '') // Remove bold metadata
      .replace(/^\s*---.*$/gm, '') // Remove separators
      .replace(/^\s*## .*/gm, '') // Remove section headers
      .replace(/^\s*\*.*$/gm, '') // Remove bullet points
      .replace(/\[(\d{2}:\d{2}.*?)\]/g, '') // Remove timestamps
      .replace(/\n+/g, ' ') // Replace line breaks with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  static async extractTranscript(videoUrl: string): Promise<TranscriptResult> {
    // Use the enhanced fallback system by default
    return this.extractTranscriptWithFallback(videoUrl);
  }

  static async processVideoWithRetry(videoUrl: string, maxRetries: number = 3): Promise<TranscriptResult> {
    let lastResult: TranscriptResult | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`🔄 Enhanced transcript extraction attempt ${attempt + 1}/${maxRetries}`);
      
      const result = await this.extractTranscriptWithFallback(videoUrl);
      
      if (result.success || !result.retryable) {
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries - 1) {
        // Progressive backoff: 5s, 10s, 15s
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
