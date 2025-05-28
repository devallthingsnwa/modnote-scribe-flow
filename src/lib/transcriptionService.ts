
import { toast } from "@/hooks/use-toast";
import { YouTubeService } from "./transcription/youtubeService";
import { ExternalProviderService } from "./transcription/externalProviderService";
import { MediaTypeDetector } from "./transcription/mediaTypeDetector";
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
    
    // For YouTube videos, use enhanced extraction with Supadata priority
    if (mediaType === 'youtube') {
      console.log('Starting enhanced YouTube transcript extraction with Supadata priority...');
      
      const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url);
      
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
      title: "❌ Transcription Failed",
      description: "All transcription methods failed. This content may not support automatic transcription or may be restricted.",
      variant: "destructive",
    });

    return {
      success: false,
      error: 'All transcription providers failed. Please try again later or use a different video.'
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
