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
  private static readonly PROVIDER_PRIORITY = ['podsqueeze', 'whisper', 'riverside'] as const;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 3000, 8000];

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    const startTime = Date.now();
    
    console.log(`🎯 Starting enhanced transcription with audio fallback for ${mediaType}: ${url}`);
    
    try {
      if (mediaType === 'youtube') {
        return await this.handleYouTubeTranscriptionWithAudioFallback(url, startTime);
      }
      
      return await this.handleGeneralMediaTranscriptionWithFallback(url, startTime);
    } catch (error) {
      console.error('❌ Unexpected error in transcription service:', error);
      return this.createEnhancedFallbackResult(url, error.message, startTime);
    }
  }

  private static async handleYouTubeTranscriptionWithAudioFallback(url: string, startTime: number): Promise<TranscriptionResult> {
    console.log('🎥 Processing YouTube video with enhanced audio fallback...');
    
    const errors: string[] = [];
    const videoId = YouTubeService.extractVideoId(url);

    // Strategy 1: YouTube transcript extraction with retries
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 YouTube transcript attempt ${attempt + 1}/${this.MAX_RETRIES}`);
        
        const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url, attempt);
        
        if (youtubeResult.success && youtubeResult.text && youtubeResult.text.length > 100) {
          console.log('✅ YouTube transcript extraction successful');
          
          // Check if this is structured content (fallback template) or actual transcript
          const isWarningContent = youtubeResult.text.includes('could not be automatically transcribed') || 
                                  youtubeResult.metadata?.isWarning;
          
          if (!isWarningContent) {
            toast({
              title: "✅ Transcript Extracted",
              description: "Successfully extracted YouTube captions"
            });
            
            return {
              ...youtubeResult,
              text: youtubeResult.text,
              metadata: {
                ...youtubeResult.metadata,
                retryCount: attempt,
                strategiesAttempted: 'youtube-transcript',
                processingTime: Date.now() - startTime,
                successRate: 100
              }
            };
          }
        }
        
        if (attempt < this.MAX_RETRIES - 1) {
          console.log(`⏳ Waiting ${this.RETRY_DELAYS[attempt]}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAYS[attempt]));
        }
        
      } catch (error) {
        console.warn(`⚠️ YouTube transcript attempt ${attempt + 1} failed:`, error);
        errors.push(`YouTube-${attempt + 1}: ${error.message}`);
      }
    }

    // Strategy 2: Audio extraction + speech-to-text fallback
    console.log('🎵 Transcript failed, trying audio extraction + speech-to-text...');
    
    try {
      const audioResult = await this.tryAudioTranscription(videoId);
      
      if (audioResult.success && audioResult.text && audioResult.text.length > 50) {
        console.log('✅ Audio transcription successful');
        
        toast({
          title: "🎵 Audio Transcribed",
          description: "Successfully transcribed from video audio using Supadata AI"
        });
        
        return {
          ...audioResult,
          metadata: {
            ...audioResult.metadata,
            strategiesAttempted: 'youtube-transcript,audio-transcription',
            processingTime: Date.now() - startTime,
            successRate: 95,
            fallbackUsed: true
          }
        };
      }
      
      errors.push(`Audio-transcription: ${audioResult.error || 'Failed to extract audio'}`);
    } catch (error) {
      console.warn('⚠️ Audio transcription failed:', error);
      errors.push(`Audio-transcription: ${error.message}`);
    }

    // If we reach here, all attempts failed
    console.warn("All YouTube transcription strategies failed, creating enhanced fallback");
    return this.createEnhancedFallbackResult(url, errors.join('; '), startTime, videoId);
  }

  private static async tryAudioTranscription(videoId: string): Promise<TranscriptionResult> {
    try {
      // Use the Supabase client to call the edge function
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('youtube-audio-transcription', {
        body: {
          videoId,
          options: {
            language: 'en',
            quality: 'medium',
            include_timestamps: true
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Audio transcription service error');
      }

      if (data?.success && data?.transcript) {
        return {
          success: true,
          text: data.transcript,
          provider: 'supadata-audio',
          metadata: {
            extractionMethod: 'youtube-audio-transcription',
            provider: 'supadata-audio',
            confidence: data.metadata?.confidence,
            language: data.metadata?.language,
            processing_time: data.metadata?.processing_time
          }
        };
      }

      throw new Error(data?.error || 'Audio transcription failed');
      
    } catch (error) {
      console.error('Audio transcription error:', error);
      return {
        success: false,
        error: error.message || 'Audio transcription failed',
        provider: 'supadata-audio'
      };
    }
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
      
      for (let retry = 0; retry < 2; retry++) {
        try {
          const result = await ExternalProviderService.callTranscriptionAPI(provider, url, {
            include_metadata: true,
            include_timestamps: true,
            language: 'auto',
            timeout: 60000
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
    let score = 50;
    
    if (text.length > 1000) score += 20;
    else if (text.length > 500) score += 10;
    
    if (provider === 'podsqueeze') score += 15;
    else if (provider === 'whisper') score += 10;
    
    if (text.includes('.') && text.includes(',')) score += 10;
    if (text.match(/[A-Z]/g)?.length > 10) score += 5;
    
    return Math.min(100, score);
  }

  private static createEnhancedFallbackResult(url: string, errorDetails: string, startTime: number, videoId?: string): TranscriptionResult {
    console.log('📝 Creating enhanced fallback result with comprehensive guidance');
    
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const processingTime = Date.now() - startTime;
    
    let fallbackContent = `This YouTube video could not be automatically transcribed. Common reasons:\n\n`;
    fallbackContent += `- **No Captions Available**: Video doesn't have auto-generated or manual captions\n`;
    fallbackContent += `- **Private/Restricted Content**: Video has access restrictions\n`;
    fallbackContent += `- **Live Stream**: Live content may not have stable captions\n`;
    fallbackContent += `- **Language Barriers**: Non-English content without proper language detection\n`;
    fallbackContent += `- **Technical Issues**: Temporary service limitations or API restrictions\n\n`;
    fallbackContent += `### 💡 Alternative Options\n\n`;
    fallbackContent += `1. **Check YouTube Captions**: Visit the video directly and look for CC button\n`;
    fallbackContent += `2. **Manual Summary**: Watch and create your own key points below\n`;
    fallbackContent += `3. **Audio Recording**: Use voice notes to summarize while watching\n`;
    fallbackContent += `4. **Third-party Tools**: Try external transcription services\n\n`;
    fallbackContent += `---\n\n`;
    fallbackContent += `## 📝 My Notes\n\n`;
    fallbackContent += `### 🎯 Key Points\n`;
    fallbackContent += `- [ ] Main topic/theme:\n`;
    fallbackContent += `- [ ] Important insights:\n`;
    fallbackContent += `- [ ] Action items:\n`;
    fallbackContent += `- [ ] Questions raised:\n\n`;
    fallbackContent += `### ⏰ Timestamps & Moments\n`;
    fallbackContent += `*Add specific timestamps and what happens at those moments*\n\n`;
    fallbackContent += `- **00:00** - \n`;
    fallbackContent += `- **05:00** - \n`;
    fallbackContent += `- **10:00** - \n\n`;
    fallbackContent += `### 💭 Personal Reflections\n`;
    fallbackContent += `*Your thoughts, opinions, and how this relates to your interests*\n\n`;
    fallbackContent += `---\n\n`;
    fallbackContent += `*Note: This content was saved automatically when transcription was unavailable. You can edit this note to add your own insights and observations.*`;

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
        providersAttempted: this.PROVIDER_PRIORITY.join(', '),
        fallbackType: isYouTube ? 'youtube-smart-template' : 'general-smart-template',
        processingTime,
        retryCount: this.MAX_RETRIES,
        strategiesAttempted: isYouTube ? 'youtube-transcript,audio-extraction,external-providers' : 'external-providers',
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
