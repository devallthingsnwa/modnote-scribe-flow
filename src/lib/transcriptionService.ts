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
import { TranscriptFormatter } from "./transcription/formatters";

export type { TranscriptionConfig, TranscriptionResult, YouTubeMetadata, MediaType };

export class TranscriptionService {
  private static readonly PROVIDER_PRIORITY = ['podsqueeze', 'whisper', 'riverside'] as const;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 3000, 8000];

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    const startTime = Date.now();
    
    console.log(`🎯 Starting enhanced transcription for ${mediaType}: ${url}`);
    
    try {
      if (mediaType === 'youtube') {
        return await this.handleYouTubeTranscriptionWithEnhancedFormat(url, startTime);
      }
      
      return await this.handleGeneralMediaTranscriptionWithFallback(url, startTime);
    } catch (error) {
      console.error('❌ Unexpected error in transcription service:', error);
      return this.createEnhancedFallbackResult(url, error.message, startTime);
    }
  }

  private static async handleYouTubeTranscriptionWithEnhancedFormat(url: string, startTime: number): Promise<TranscriptionResult> {
    console.log('🎥 Processing YouTube video with enhanced formatting...');
    
    try {
      // Use the updated YouTube service that returns formatted content
      const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url);
      
      if (youtubeResult.success && youtubeResult.text) {
        console.log('✅ YouTube transcript extraction successful with enhanced format');
        
        toast({
          title: "✅ Transcript Extracted",
          description: "Successfully extracted and formatted YouTube transcript"
        });
        
        return {
          success: true,
          text: youtubeResult.text, // Already formatted by YouTubeService
          metadata: {
            ...youtubeResult.metadata,
            processingTime: Date.now() - startTime,
            successRate: 100
          },
          provider: 'youtube-enhanced-format'
        };
      }
    } catch (error) {
      console.warn('⚠️ YouTube transcript extraction failed:', error);
    }

    // Fallback to audio extraction if available
    const videoId = YouTubeService.extractVideoId(url);
    if (videoId) {
      try {
        console.log('🎵 Attempting audio extraction with enhanced format...');
        
        const audioResult = await YouTubeAudioService.extractAudioAndTranscribe(videoId);
        
        if (audioResult.success && audioResult.text && audioResult.text.length > 50) {
          // Get metadata and format the result
          const metadata = await YouTubeService.getYouTubeMetadata(videoId);
          const formattedContent = TranscriptFormatter.formatEnhancedTranscript(
            {
              title: metadata.title,
              author: metadata.author,
              duration: metadata.duration,
              url: url
            },
            { text: audioResult.text }
          );
          
          toast({
            title: "✅ Audio Transcribed",
            description: "Successfully transcribed via audio extraction"
          });
          
          return {
            success: true,
            text: formattedContent,
            metadata: {
              ...audioResult.metadata,
              processingTime: Date.now() - startTime,
              successRate: 85
            },
            provider: 'youtube-audio-enhanced'
          };
        }
      } catch (error) {
        console.warn('⚠️ Audio extraction failed:', error);
      }
    }

    // Final fallback with enhanced format
    return this.createEnhancedFallbackResult(url, 'All extraction methods failed', startTime, videoId);
  }

  private static async handleGeneralMediaTranscriptionWithFallback(url: string, startTime: number): Promise<TranscriptionResult> {
    console.log('🎵 Processing general media with enhanced fallback...');
    
    try {
      const result = await this.tryExternalProvidersWithEnhancedRetry(url);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          strategiesAttempted: 'external-providers',
          processingTime: Date.now() - startTime,
          successRate: result.success ? 90 : 0
        }
      };
    } catch (error) {
      console.warn('⚠️ General media transcription failed:', error);
      return this.createEnhancedFallbackResult(url, error.message, startTime);
    }
  }

  private static async tryExternalProvidersWithEnhancedRetry(url: string): Promise<TranscriptionResult> {
    const errors: string[] = [];
    const providersAttempted: string[] = [];
    
    for (const provider of this.PROVIDER_PRIORITY) {
      console.log(`🔄 Attempting transcription with ${provider}...`);
      providersAttempted.push(provider);
      
      for (let retry = 0; retry < 2; retry++) { // 2 attempts per provider
        try {
          const result = await ExternalProviderService.callTranscriptionAPI(provider, url, {
            include_metadata: true,
            include_timestamps: true,
            language: 'auto',
            timeout: 60000 // 1 minute timeout
          });
          
          if (result.success && result.text && result.text.length > 50) {
            console.log(`✅ Transcription successful with ${provider} (attempt ${retry + 1})`);
            
            toast({
              title: "✅ Transcription Complete",
              description: `Successfully transcribed using ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
            });
            
            return {
              ...result,
              metadata: {
                ...result.metadata,
                retryCount: retry,
                providersAttempted: providersAttempted.join(','),
                confidenceScore: this.calculateConfidenceScore(result.text, provider)
              }
            };
          }
          
          const errorMsg = `${provider} (attempt ${retry + 1}): ${result.error || 'Insufficient content'}`;
          errors.push(errorMsg);
          
          if (retry === 0) {
            console.log(`⏳ Retrying ${provider} in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          const errorMsg = `${provider} (attempt ${retry + 1}): ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${provider} attempt ${retry + 1} failed:`, error);
          
          if (retry === 0 && error.message.includes('timeout')) {
            console.log(`⏳ Retrying ${provider} with extended timeout...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    }

    throw new Error(`All providers failed: ${errors.join('; ')}`);
  }

  private static calculateConfidenceScore(text: string, provider: string): number {
    let score = 50; // Base score
    
    // Length bonus
    if (text.length > 1000) score += 20;
    else if (text.length > 500) score += 10;
    
    // Provider reliability bonus
    if (provider === 'podsqueeze') score += 15;
    else if (provider === 'whisper') score += 10;
    
    // Text quality indicators
    if (text.includes('.') && text.includes(',')) score += 10;
    if (text.match(/[A-Z]/g)?.length > 10) score += 5;
    
    return Math.min(100, score);
  }

  private static createEnhancedFallbackResult(url: string, errorDetails: string, startTime: number, videoId?: string): TranscriptionResult {
    console.log('📝 Creating enhanced fallback result with proper formatting');
    
    const fallbackContent = TranscriptFormatter.formatFallbackNote(url, videoId);
    const processingTime = Date.now() - startTime;

    toast({
      title: "📝 Smart Note Created",
      description: "Transcript unavailable - created structured note for manual input",
      variant: "default"
    });

    return {
      success: true,
      text: fallbackContent,
      metadata: {
        extractionMethod: 'enhanced-smart-fallback',
        isWarning: true,
        failureReason: errorDetails,
        processingTime,
        retryCount: this.MAX_RETRIES,
        confidenceScore: 0,
        successRate: 0
      },
      provider: 'smart-fallback-system'
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

  static getProviderConfig(): TranscriptionConfig[] {
    return this.PROVIDER_PRIORITY.map((provider, index) => ({
      provider: provider as any,
      enabled: true,
      priority: index + 1
    }));
  }
}
