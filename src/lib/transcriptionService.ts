
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
      
      // Extract video ID once at the beginning
      const videoId = YouTubeService.extractVideoId(url);
      
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
      
      // Step 3: Try external transcription providers
      const externalResult = await ExternalProviderService.tryExternalProviders(url);
      
      if (externalResult.success) {
        toast({
          title: "✅ Transcript Extracted Successfully!",
          description: `Successfully extracted transcript using ${externalResult.provider}`
        });
        
        return externalResult;
      }

      // Step 4: If all methods fail, return a "success" result with warning content
      console.warn('All transcription methods failed, but we will still save the note with a warning');
      
      const warningMessage = "⚠️ **Transcript Not Available**\n\nAll transcription methods failed for this video. This could be due to:\n- Video has no captions or auto-generated captions disabled\n- Video is private, restricted, or region-locked\n- Audio quality issues preventing transcription\n- API rate limits or temporary service issues\n\nYou can still use this note to add your own observations about the video.";
      
      toast({
        title: "⚠️ Transcript Unavailable",
        description: "Note saved with warning - transcript could not be extracted",
        variant: "default"
      });

      return {
        success: true, // Return success so the note gets saved
        text: warningMessage,
        metadata: {
          videoId: videoId || 'unknown',
          extractionMethod: 'failed-with-warning',
          isWarning: true
        },
        provider: 'warning-fallback'
      };
    }
    
    // Handle other media types similarly
    const externalResult = await ExternalProviderService.tryExternalProviders(url);
    
    if (externalResult.success) {
      toast({
        title: "✅ Content Extracted Successfully!",
        description: `Successfully extracted content using ${externalResult.provider}`
      });
      
      return externalResult;
    }

    // For non-YouTube content that fails, also provide a warning fallback
    const warningMessage = "⚠️ **Content Not Available**\n\nUnable to extract content from this URL. You can still use this note to add your own thoughts and observations about the content.";
    
    toast({
      title: "⚠️ Content Unavailable",
      description: "Note saved with warning - content could not be extracted",
      variant: "default"
    });

    return {
      success: true,
      text: warningMessage,
      metadata: {
        extractionMethod: 'failed-with-warning',
        isWarning: true
      },
      provider: 'warning-fallback'
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
