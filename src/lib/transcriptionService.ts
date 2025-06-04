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
  private static readonly PROVIDER_PRIORITY = ['podsqueeze', 'whisper', 'riverside'] as const;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 3000, 8000];

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    const startTime = Date.now();
    
    console.log(`🎯 Starting enhanced transcription with robust fallback for ${mediaType}: ${url}`);
    
    try {
      if (mediaType === 'youtube') {
        return await this.handleYouTubeTranscriptionWithEnhancedFallback(url, startTime);
      }
      
      return await this.handleGeneralMediaTranscriptionWithFallback(url, startTime);
    } catch (error) {
      console.error('❌ Unexpected error in transcription service:', error);
      return this.createEnhancedFallbackResult(url, error.message, startTime);
    }
  }

  private static async handleYouTubeTranscriptionWithEnhancedFallback(url: string, startTime: number): Promise<TranscriptionResult> {
    console.log('🎥 Processing YouTube video with enhanced multi-strategy fallback...');
    
    const strategies = [
      'youtube-transcript',
      'youtube-audio-extraction', 
      'external-providers'
    ];
    
    const errors: string[] = [];
    let retryCount = 0;

    // Strategy 1: YouTube transcript extraction with retries
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 YouTube transcript attempt ${attempt + 1}/${this.MAX_RETRIES}`);
        
        const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url, attempt);
        
        if (youtubeResult.success && youtubeResult.text && youtubeResult.text.length > 100) {
          console.log('✅ YouTube transcript extraction successful');
          
          // Format the transcript with proper structure
          const formattedText = this.formatTranscriptContent(youtubeResult.text, url);
          
          toast({
            title: "✅ Transcript Extracted",
            description: "Successfully extracted YouTube captions"
          });
          
          return {
            ...youtubeResult,
            text: formattedText,
            metadata: {
              ...youtubeResult.metadata,
              retryCount: attempt,
              strategiesAttempted: 'youtube-transcript',
              processingTime: Date.now() - startTime,
              successRate: 100
            }
          };
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

    // Strategy 2: Audio extraction with Supadata
    const videoId = YouTubeService.extractVideoId(url);
    if (videoId) {
      try {
        console.log('🎵 Attempting audio extraction with Supadata...');
        
        const audioResult = await YouTubeAudioService.extractAudioAndTranscribe(videoId);
        
        if (audioResult.success && audioResult.text && audioResult.text.length > 50) {
          console.log('✅ Audio transcription successful');
          
          const formattedText = this.formatTranscriptContent(audioResult.text, url);
          
          toast({
            title: "✅ Audio Transcribed",
            description: "Successfully transcribed via audio extraction"
          });
          
          return {
            ...audioResult,
            text: formattedText,
            metadata: {
              ...audioResult.metadata,
              strategiesAttempted: 'youtube-transcript,audio-extraction',
              processingTime: Date.now() - startTime,
              successRate: 85
            }
          };
        }
        
        errors.push(`Audio extraction: ${audioResult.error || 'Low quality result'}`);
      } catch (error) {
        console.warn('⚠️ Audio extraction failed:', error);
        errors.push(`Audio extraction: ${error.message}`);
      }
    }

    // Strategy 3: External providers with enhanced retry
    try {
      console.log('🌐 Trying external providers with enhanced fallback...');
      
      const externalResult = await this.tryExternalProvidersWithEnhancedRetry(url);
      
      if (externalResult.success && externalResult.text && externalResult.text.length > 50) {
        const formattedText = this.formatTranscriptContent(externalResult.text, url);
        
        return {
          ...externalResult,
          text: formattedText,
          metadata: {
            ...externalResult.metadata,
            strategiesAttempted: strategies.join(','),
            processingTime: Date.now() - startTime,
            successRate: 70
          }
        };
      }
      
      errors.push(`External providers: ${externalResult.error}`);
    } catch (error) {
      console.warn('⚠️ External providers failed:', error);
      errors.push(`External providers: ${error.message}`);
    }

    // Enhanced fallback with detailed guidance
    return this.createEnhancedFallbackResult(url, errors.join('; '), startTime, videoId);
  }

  private static formatTranscriptContent(transcript: string, url: string): string {
    const videoId = YouTubeService.extractVideoId(url);
    let videoTitle = `YouTube Video ${videoId}`;
    
    // Try to extract title from transcript if it's formatted
    const titleMatch = transcript.match(/^# 🎥 "(.+)"/);
    if (titleMatch) {
      return transcript; // Already formatted
    }
    
    const currentDate = new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let formattedContent = `# 🎥 "${videoTitle}"\n\n`;
    formattedContent += `**Source:** ${url}\n`;
    formattedContent += `**Type:** Video Transcript\n`;
    formattedContent += `**Imported:** ${currentDate}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 Transcript\n\n`;
    formattedContent += `${transcript}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 My Notes\n\n`;
    formattedContent += `Add your personal notes and thoughts here...\n`;

    return formattedContent;
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
    
    const currentDate = new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let fallbackContent = `# 🎥 "${isYouTube ? `YouTube Video ${videoId || 'Unknown'}` : 'Media Content'}"\n\n`;
    fallbackContent += `**Source:** ${url}\n`;
    fallbackContent += `**Type:** Video Note\n`;
    fallbackContent += `**Imported:** ${currentDate}\n`;
    fallbackContent += `**Status:** ⚠️ Automatic transcription unavailable\n`;
    fallbackContent += `**Processing Time:** ${(processingTime / 1000).toFixed(1)}s\n\n`;
    fallbackContent += `---\n\n`;
    fallbackContent += `## 📝 Transcript\n\n`;
    
    if (isYouTube) {
      fallbackContent += `This YouTube video could not be automatically transcribed. Common reasons:\n\n`;
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
    } else {
      fallbackContent += `This content could not be automatically transcribed. You can still:\n\n`;
      fallbackContent += `- **Manual Notes**: Add your own observations and summaries\n`;
      fallbackContent += `- **Key Timestamps**: Note important moments if it's a time-based media\n`;
      fallbackContent += `- **Reference Links**: Add related resources and follow-up materials\n\n`;
    }
    
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
      description: "Transcription unavailable - created structured note for manual input",
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
