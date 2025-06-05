
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
  // Transcription API priority: Podsqueeze (default) → Whisper (OSS) → Riverside.fm (fallback)
  private static readonly PROVIDER_PRIORITY = ['podsqueeze', 'whisper', 'riverside'] as const;

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    
    console.log(`🎯 Starting transcription for ${mediaType} content: ${url}`);
    
    // For YouTube videos, use enhanced extraction with multiple fallbacks
    if (mediaType === 'youtube') {
      return await this.handleYouTubeTranscription(url);
    }
    
    // For other media types (podcasts, audio files), use external providers
    return await this.handleGeneralMediaTranscription(url);
  }

  private static async handleYouTubeTranscription(url: string): Promise<TranscriptionResult> {
    console.log('🎥 Processing YouTube video with enhanced extraction...');
    
    // Step 1: Try YouTube transcript extraction (fastest)
    const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url);
    
    if (youtubeResult.success) {
      console.log('✅ YouTube transcript extraction successful');
      return youtubeResult;
    }
    
    console.warn('⚠️ YouTube transcript failed, trying audio extraction...');
    
    // Step 2: Try audio extraction with Supadata
    const videoId = YouTubeService.extractVideoId(url);
    if (videoId) {
      const audioResult = await YouTubeAudioService.extractAudioAndTranscribe(videoId);
      
      if (audioResult.success) {
        console.log('✅ Audio transcription successful with Supadata');
        return audioResult;
      }
    }
    
    console.warn('⚠️ Audio extraction failed, trying external providers...');
    
    // Step 3: Try external transcription providers with priority
    return await this.tryExternalProvidersWithPriority(url);
  }

  private static async handleGeneralMediaTranscription(url: string): Promise<TranscriptionResult> {
    console.log('🎵 Processing general media content...');
    
    // For non-YouTube content, go straight to external providers
    return await this.tryExternalProvidersWithPriority(url);
  }

  private static async tryExternalProvidersWithPriority(url: string): Promise<TranscriptionResult> {
    for (const provider of this.PROVIDER_PRIORITY) {
      console.log(`🔄 Attempting transcription with ${provider}...`);
      
      try {
        const result = await ExternalProviderService.callTranscriptionAPI(provider, url, {
          include_metadata: true,
          include_timestamps: true,
          language: 'auto'
        });
        
        if (result.success && result.text && result.text.length > 50) {
          console.log(`✅ Transcription successful with ${provider}`);
          
          toast({
            title: "✅ Transcription Complete",
            description: `Successfully transcribed using ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
          });
          
          return result;
        }
        
        console.warn(`⚠️ ${provider} returned empty/short transcription, trying next...`);
        
      } catch (error) {
        console.error(`❌ ${provider} failed:`, error);
        continue;
      }
    }

    // If all providers fail, return a fallback result that still allows note creation
    console.warn('❌ All transcription providers failed');
    
    const fallbackMessage = `⚠️ **Transcription Unavailable**\n\nAll transcription services failed for this content. This could be due to:\n- Content restrictions or privacy settings\n- Audio quality issues\n- Temporary service unavailability\n- Unsupported media format\n\nYou can still use this note to add your own observations about the content.`;
    
    toast({
      title: "⚠️ Transcription Failed",
      description: "Note saved with warning - transcription could not be completed",
      variant: "default"
    });

    return {
      success: true, // Return success so note gets saved
      text: fallbackMessage,
      metadata: {
        extractionMethod: 'fallback-warning',
        isWarning: true,
        providersAttempted: this.PROVIDER_PRIORITY.join(', ')
      },
      provider: 'fallback-system'
    };
  }

  static async getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
    try {
      return await YouTubeService.getYouTubeMetadata(videoId);
    } catch (error) {
      console.error('Failed to fetch YouTube metadata:', error);
      return {
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        duration: 'Unknown'
      };
    }
  }

  static extractVideoId(url: string): string | null {
    return YouTubeService.extractVideoId(url);
  }

  static detectMediaType(url: string): MediaType {
    return MediaTypeDetector.detectMediaType(url);
  }

  // Configuration management for transcription providers
  static getProviderConfig(): TranscriptionConfig[] {
    return this.PROVIDER_PRIORITY.map((provider, index) => ({
      provider: provider as any,
      enabled: true,
      priority: index + 1
    }));
  }
}
