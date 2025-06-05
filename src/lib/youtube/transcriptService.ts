
import { supabase } from "@/integrations/supabase/client";
import { TranscriptResult, VideoMetadata } from "./types";
import { SupadataService } from "./supadata";
import { VideoUtils } from "./videoUtils";

export class YouTubeTranscriptService {
  static async fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      console.log(`📊 Fetching metadata for video: ${videoId}`);
      
      // Try to get metadata from YouTube oEmbed API first
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

      // Fallback metadata
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

  static async extractTranscript(videoUrl: string): Promise<TranscriptResult> {
    const videoId = VideoUtils.extractVideoId(videoUrl);
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube URL format',
        source: 'fallback'
      };
    }

    console.log(`🚀 Starting smart transcript extraction for video: ${videoId}`);

    try {
      // Step 1: Fetch video metadata
      const metadata = await this.fetchVideoMetadata(videoId);

      // Step 2: Try to get transcript from captions first (fastest method)
      console.log(`📝 Attempting caption-based transcript extraction...`);
      const captionResult = await SupadataService.fetchTranscript(videoId);
      
      if (captionResult.success && captionResult.transcript) {
        console.log(`✅ Caption-based transcript successful`);
        return {
          success: true,
          transcript: captionResult.transcript,
          segments: captionResult.segments,
          metadata,
          source: 'captions'
        };
      }

      // Step 3: Fallback to audio transcription if captions not available
      console.log(`⚠️ Captions not available, falling back to audio transcription...`);
      const audioResult = await SupadataService.transcribeAudio(videoId);
      
      if (audioResult.success && audioResult.transcript) {
        console.log(`✅ Audio transcription successful`);
        return {
          success: true,
          transcript: audioResult.transcript,
          metadata,
          source: 'audio-transcription'
        };
      }

      // Step 4: Final fallback - return error with metadata
      console.error(`❌ All transcript extraction methods failed`);
      return {
        success: false,
        error: 'Unable to extract transcript or transcribe audio for this video',
        metadata,
        source: 'fallback'
      };

    } catch (error) {
      console.error('❌ Transcript extraction failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to extract transcript',
        source: 'fallback'
      };
    }
  }

  static async processVideoWithRetry(videoUrl: string, maxRetries: number = 2): Promise<TranscriptResult> {
    let lastResult: TranscriptResult | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Transcript extraction attempt ${attempt}/${maxRetries}`);
      
      const result = await this.extractTranscript(videoUrl);
      
      if (result.success) {
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⏳ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return lastResult || {
      success: false,
      error: 'All extraction attempts failed',
      source: 'fallback'
    };
  }
}
