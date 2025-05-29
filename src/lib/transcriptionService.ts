import { toast } from "@/hooks/use-toast";
import { YouTubeService } from "./transcription/youtubeService";
import { ExternalProviderService } from "./transcription/externalProviderService";
import { MediaTypeDetector } from "./transcription/mediaTypeDetector";
import { YouTubeAudioService } from "./transcription/youtubeAudioService";
import { 
  TranscriptionConfig, 
  TranscriptionResult, 
  YouTubeMetadata, 
  MediaType 
} from "./transcription/types";

export type { TranscriptionConfig, TranscriptionResult, YouTubeMetadata, MediaType };

export class TranscriptionService {
  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    
    // For YouTube videos, use enhanced extraction with multiple fallbacks
    if (mediaType === 'youtube') {
      console.log('Starting enhanced YouTube transcript extraction with audio fallback...');
      
      // Step 1: Try standard transcript extraction
      const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url);
      
      if (youtubeResult.success) {
        const extractionMethod = youtubeResult.metadata?.extractionMethod || youtubeResult.provider;
        console.log('YouTube transcript extraction successful via:', extractionMethod);
        
        let successMessage = `Successfully extracted transcript`;
        if (extractionMethod === 'supadata-api') {
          successMessage += ' using Supadata API';
        } else if (extractionMethod === 'youtube-audio-supadata') {
          successMessage += ' using Supadata audio extraction and transcription';
        } else {
          successMessage += ` using ${extractionMethod}`;
        }
        
        toast({
          title: "✅ Transcript Extracted Successfully!",
          description: successMessage
        });
        
        return youtubeResult;
      }
      
      console.warn('Standard transcript extraction failed, trying audio extraction...');
      
      // Step 2: Try audio extraction and transcription with Supadata
      const videoId = YouTubeService.extractVideoId(url);
      if (videoId) {
        const audioResult = await YouTubeAudioService.extractAudioAndTranscribe(videoId);
        
        if (audioResult.success) {
          toast({
            title: "✅ Audio Transcription Successful!",
            description: "Successfully extracted and transcribed audio using Supadata AI"
          });
          
          return audioResult;
        }
        
        console.warn('Audio extraction also failed, trying external providers...');
      }
      
      // Enhanced error handling for specific failure cases
      let errorDetails = youtubeResult.error || 'Unknown error';
      if (errorDetails.includes('captions')) {
        toast({
          title: "⚠️ No Captions Available",
          description: "Video has no captions and audio extraction failed. Trying alternative providers...",
          variant: "destructive",
        });
      } else if (errorDetails.includes('private') || errorDetails.includes('restricted')) {
        toast({
          title: "🔒 Video Restricted",
          description: "Video is private/restricted and audio extraction failed. Trying alternative providers...",
          variant: "destructive",
        });
      }
    }
    
    // Try external transcription providers as final fallback
    const externalResult = await ExternalProviderService.tryExternalProviders(url);
    
    if (externalResult.success) {
      toast({
        title: "✅ Transcript Extracted Successfully!",
        description: `Successfully extracted transcript using ${externalResult.provider}`
      });
      
      return externalResult;
    }

    // If all providers fail
    toast({
      title: "❌ All Transcription Methods Failed",
      description: "Standard transcripts, audio extraction, and external providers all failed. This content may not support automatic transcription.",
      variant: "destructive",
    });

    return {
      success: false,
      error: 'All transcription methods failed including audio extraction. Please try again later or use a different video.'
    };
  }

  static async getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
    return YouTubeService.getYouTubeMetadata(videoId);
  }

  static extractVideoId(url: string): string | null {
    return YouTubeService.extractVideoId(url);
  }

  static detectMediaType(url: string): MediaType {
    return MediaTypeDetector.detectMediaType(url);
  }
}
