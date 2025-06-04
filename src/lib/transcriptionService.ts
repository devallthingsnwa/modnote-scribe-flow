
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  private static readonly PROVIDER_PRIORITY = ['youtube-transcript', 'external-providers'] as const;
  private static readonly MAX_RETRIES = 2; // Reduced for faster processing
  private static readonly RETRY_DELAYS = [2000, 5000]; // Shorter delays

  static async transcribeWithFallback(url: string): Promise<TranscriptionResult> {
    const mediaType = MediaTypeDetector.detectMediaType(url);
    const startTime = Date.now();
    
    console.log(`🚀 Starting optimized transcription for ${mediaType}: ${url}`);
    
    try {
      if (mediaType === 'youtube') {
        return await this.handleOptimizedYouTubeTranscription(url, startTime);
      }
      
      return await this.handleGeneralMediaTranscriptionOptimized(url, startTime);
    } catch (error) {
      console.error('❌ Unexpected error in transcription service:', error);
      return this.createOptimizedFallbackResult(url, error.message, startTime);
    }
  }

  private static async handleOptimizedYouTubeTranscription(url: string, startTime: number): Promise<TranscriptionResult> {
    console.log('🎥 Processing YouTube video with optimized extraction...');
    
    const videoId = YouTubeService.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }

    // Parallel processing: Get metadata while attempting transcript
    const [transcriptResult, metadata] = await Promise.allSettled([
      this.fastYouTubeTranscript(url),
      this.getYouTubeMetadata(videoId)
    ]);

    const metadataValue = metadata.status === 'fulfilled' ? metadata.value : {};
    
    if (transcriptResult.status === 'fulfilled' && transcriptResult.value.success) {
      const result = transcriptResult.value;
      const formattedText = this.formatTranscriptContentOptimized(result.text, url, metadataValue);
      
      console.log('✅ Optimized YouTube transcript extraction successful');
      
      toast({
        title: "✅ Transcript Extracted",
        description: "Successfully extracted YouTube captions"
      });
      
      return {
        ...result,
        text: formattedText,
        metadata: {
          ...result.metadata,
          processingTime: Date.now() - startTime,
          successRate: 100
        }
      };
    }

    // Quick fallback for better user experience
    console.log('📝 Creating smart fallback note...');
    return this.createOptimizedFallbackResult(url, 'Transcript not available', startTime, videoId, metadataValue);
  }

  private static async fastYouTubeTranscript(url: string): Promise<TranscriptionResult> {
    try {
      const videoId = YouTubeService.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`🎯 Fast YouTube transcript extraction for: ${videoId}`);
      
      const { data, error } = await Promise.race([
        supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              includeTimestamps: false,
              language: 'auto',
              format: 'text',
              qualityLevel: 'high',
              fastMode: true
            }
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Fast transcript timeout')), 30000)
        )
      ]);

      if (error) {
        throw error;
      }

      if (data?.success && data?.transcript && data.transcript.length > 20) {
        console.log(`✅ Fast transcript extracted: ${data.transcript.length} chars`);
        
        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            extractionMethod: 'fast-youtube-transcript',
            qualityScore: 90
          },
          provider: 'youtube-transcript-optimized'
        };
      } else {
        throw new Error('No transcript data received');
      }
    } catch (error) {
      console.error(`❌ Fast YouTube transcript failed:`, error);
      
      return {
        success: false,
        error: error.message || 'YouTube transcript extraction failed',
        provider: 'youtube-transcript-optimized'
      };
    }
  }

  private static async handleGeneralMediaTranscriptionOptimized(url: string, startTime: number): Promise<TranscriptionResult> {
    console.log('🎵 Processing general media with optimized approach...');
    
    try {
      const result = await ExternalProviderService.callTranscriptionAPI('podsqueeze', url, {
        include_metadata: true,
        timeout: 30000 // Reduced timeout
      });
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          strategiesAttempted: 'external-providers-optimized',
          processingTime: Date.now() - startTime,
          successRate: result.success ? 90 : 0
        }
      };
    } catch (error) {
      console.warn('⚠️ General media transcription failed:', error);
      return this.createOptimizedFallbackResult(url, error.message, startTime);
    }
  }

  private static formatTranscriptContentOptimized(transcript: string, url: string, metadata: YouTubeMetadata): string {
    const videoId = YouTubeService.extractVideoId(url);
    
    const title = metadata.title || `YouTube Video ${videoId}`;
    const author = metadata.author || 'Unknown';
    const duration = metadata.duration || 'Unknown';
    
    // Clean and optimize transcript text
    let cleanTranscript = transcript
      .replace(/^#+\s*.*$/gm, '')
      .replace(/^\*\*.*\*\*$/gm, '')
      .replace(/^---+$/gm, '')
      .replace(/^##\s*.*$/gm, '')
      .replace(/^Add your personal notes.*$/gm, '')
      .trim();

    // Format with exact structure requested
    return `# 🎥 ${title}

**Source:** ${url}
**Author:** ${author}
**Duration:** ${duration}
**Type:** Video Transcript

---

## 📝 Transcript

${cleanTranscript}`;
  }

  private static createOptimizedFallbackResult(url: string, errorDetails: string, startTime: number, videoId?: string, metadata?: YouTubeMetadata): TranscriptionResult {
    console.log('📝 Creating optimized fallback result');
    
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const processingTime = Date.now() - startTime;
    
    const title = metadata?.title || (isYouTube ? `YouTube Video ${videoId || 'Unknown'}` : 'Media Content');
    const author = metadata?.author || 'Unknown';
    const duration = metadata?.duration || 'Unknown';
    
    let fallbackContent = `# 🎥 ${title}

**Source:** ${url}
**Author:** ${author}
**Duration:** ${duration}
**Type:** Video Note

---

## 📝 Transcript

This video transcript could not be automatically extracted. You can:

1. **Check YouTube Captions**: Visit the video and look for the CC button
2. **Manual Notes**: Add your own summary and key points below
3. **Copy Captions**: If available, copy from YouTube and paste here

---

## 📝 My Notes

Add your notes and observations here...`;

    toast({
      title: "📝 Smart Note Created",
      description: "Transcript unavailable - note ready for manual input",
      variant: "default"
    });

    return {
      success: true,
      text: fallbackContent,
      metadata: {
        extractionMethod: 'optimized-smart-fallback',
        isWarning: true,
        failureReason: errorDetails,
        processingTime,
        successRate: 0
      },
      provider: 'smart-fallback-optimized'
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
