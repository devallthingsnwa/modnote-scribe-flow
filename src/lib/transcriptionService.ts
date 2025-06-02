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

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    
    console.log(`🎯 Starting enhanced transcription for ${mediaType} content: ${url}`);
    
    if (mediaType === 'youtube') {
      return await this.handleYouTubeTranscription(url);
    }
    
    return await this.handleGeneralMediaTranscription(url);
  }

  private static async handleYouTubeTranscription(url: string): Promise<TranscriptionResult> {
    console.log('🎥 Processing YouTube video with enhanced extraction...');
    
    // Step 1: Try YouTube transcript extraction (fastest and most reliable)
    try {
      const youtubeResult = await YouTubeService.fetchYouTubeTranscript(url);
      
      if (youtubeResult.success && youtubeResult.text && youtubeResult.text.length > 100) {
        console.log('✅ YouTube transcript extraction successful');
        return youtubeResult;
      }
    } catch (error) {
      console.warn('⚠️ YouTube transcript extraction failed:', error);
    }
    
    console.log('🔄 Trying audio extraction with Supadata...');
    
    // Step 2: Try audio extraction with Supadata
    const videoId = YouTubeService.extractVideoId(url);
    if (videoId) {
      try {
        const audioResult = await YouTubeAudioService.extractAudioAndTranscribe(videoId);
        
        if (audioResult.success && audioResult.text && audioResult.text.length > 50) {
          console.log('✅ Audio transcription successful with Supadata');
          return audioResult;
        }
      } catch (error) {
        console.warn('⚠️ Audio extraction failed:', error);
      }
    }
    
    console.log('🔄 Trying external providers with priority...');
    
    // Step 3: Try external transcription providers (skip for YouTube URLs that can't be processed)
    try {
      const result = await this.tryExternalProvidersWithPriority(url);
      if (result.success && result.text && result.text.length > 50) {
        return result;
      }
    } catch (error) {
      console.warn('⚠️ External providers failed:', error);
    }
    
    // Step 4: Create a useful fallback note
    return this.createFallbackResult(url, videoId);
  }

  private static async handleGeneralMediaTranscription(url: string): Promise<TranscriptionResult> {
    console.log('🎵 Processing general media content...');
    
    try {
      return await this.tryExternalProvidersWithPriority(url);
    } catch (error) {
      console.warn('⚠️ General media transcription failed:', error);
      return this.createFallbackResult(url);
    }
  }

  private static async tryExternalProvidersWithPriority(url: string): Promise<TranscriptionResult> {
    const errors: string[] = [];
    
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
        
        errors.push(`${provider}: ${result.error || 'Empty result'}`);
        console.warn(`⚠️ ${provider} returned insufficient content, trying next...`);
        
      } catch (error) {
        const errorMsg = `${provider}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${provider} failed:`, error);
        continue;
      }
    }

    throw new Error(`All providers failed: ${errors.join(', ')}`);
  }

  private static createFallbackResult(url: string, videoId?: string): TranscriptionResult {
    console.log('📝 Creating fallback result with helpful guidance');
    
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    
    let fallbackContent = `# 🎥 Video Note\n\n`;
    fallbackContent += `**Source:** ${url}\n`;
    fallbackContent += `**Status:** ⚠️ Transcript unavailable\n`;
    fallbackContent += `**Created:** ${new Date().toLocaleString()}\n\n`;
    fallbackContent += `---\n\n`;
    
    if (isYouTube) {
      fallbackContent += `## 📋 About This Video\n\n`;
      fallbackContent += `This YouTube video could not be automatically transcribed due to:\n`;
      fallbackContent += `- Captions may be disabled or unavailable\n`;
      fallbackContent += `- Video may have content restrictions\n`;
      fallbackContent += `- Temporary service limitations\n\n`;
      fallbackContent += `## 💡 What You Can Do\n\n`;
      fallbackContent += `1. **Manual Notes**: Add your own observations and key points below\n`;
      fallbackContent += `2. **External Tools**: Try using YouTube's auto-generated captions if available\n`;
      fallbackContent += `3. **Audio Recording**: Record and transcribe key sections manually\n\n`;
    } else {
      fallbackContent += `## 📋 About This Content\n\n`;
      fallbackContent += `This content could not be automatically transcribed. You can still use this note to:\n`;
      fallbackContent += `- Add your own summary and key points\n`;
      fallbackContent += `- Save important timestamps and references\n`;
      fallbackContent += `- Organize your thoughts about this content\n\n`;
    }
    
    fallbackContent += `## 📝 My Notes\n\n`;
    fallbackContent += `*Add your personal notes, observations, and key takeaways here...*\n\n`;
    fallbackContent += `### Key Points\n`;
    fallbackContent += `- \n`;
    fallbackContent += `- \n`;
    fallbackContent += `- \n\n`;
    fallbackContent += `### Questions/Follow-up\n`;
    fallbackContent += `- \n`;
    fallbackContent += `- \n\n`;
    fallbackContent += `### Related Resources\n`;
    fallbackContent += `- \n`;
    fallbackContent += `- \n`;

    toast({
      title: "📝 Note Created",
      description: "Transcript unavailable - note saved for manual input",
      variant: "default"
    });

    return {
      success: true,
      text: fallbackContent,
      metadata: {
        extractionMethod: 'enhanced-fallback',
        isWarning: true,
        providersAttempted: this.PROVIDER_PRIORITY.join(', '),
        fallbackType: isYouTube ? 'youtube-guidance' : 'general-guidance'
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

  static getProviderConfig(): TranscriptionConfig[] {
    return this.PROVIDER_PRIORITY.map((provider, index) => ({
      provider: provider as any,
      enabled: true,
      priority: index + 1
    }));
  }
}
