
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult, YouTubeMetadata } from "./types";
import { YouTubeAudioService } from "./youtubeAudioService";

export class YouTubeService {
  // Enhanced metadata extraction with multiple sources
  static async getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
    console.log(`📊 Fetching enhanced metadata for video: ${videoId}`);
    
    try {
      // Try multiple metadata sources in parallel for faster results
      const [supabaseResult, directResult] = await Promise.allSettled([
        // Primary: Supabase function with YouTube API
        supabase.functions.invoke('youtube-metadata', {
          body: { videoId }
        }),
        // Fallback: Direct oembed API (faster but less data)
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
          .then(res => res.ok ? res.json() : null)
      ]);

      let metadata: YouTubeMetadata = {};

      // Process Supabase result (most complete)
      if (supabaseResult.status === 'fulfilled' && supabaseResult.value.data && !supabaseResult.value.error) {
        const data = supabaseResult.value.data;
        metadata = {
          title: data.title,
          author: data.author,
          description: data.description,
          duration: data.duration,
          thumbnail: data.thumbnail,
          publishedAt: data.publishedAt,
          viewCount: data.viewCount,
          tags: data.tags
        };
        console.log('✅ YouTube API metadata successful');
      }
      // Fallback to oembed if Supabase failed
      else if (directResult.status === 'fulfilled' && directResult.value) {
        const data = directResult.value;
        metadata = {
          title: data.title,
          author: data.author_name,
          thumbnail: data.thumbnail_url,
          duration: 'Unknown'
        };
        console.log('✅ oEmbed metadata fallback successful');
      }

      // Enhanced thumbnail selection
      if (!metadata.thumbnail) {
        metadata.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }

      // Add metadata quality indicators
      metadata.metadataQuality = metadata.title && metadata.author ? 'high' : 'basic';
      metadata.extractedAt = new Date().toISOString();

      return metadata;
    } catch (error) {
      console.error('❌ All metadata extraction methods failed:', error);
      return {
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        duration: 'Unknown',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        metadataQuality: 'minimal',
        extractedAt: new Date().toISOString()
      };
    }
  }

  static async fetchYouTubeTranscript(url: string, retryCount: number = 0): Promise<TranscriptionResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`🎥 Enhanced YouTube transcript extraction for: ${videoId} (attempt ${retryCount + 1}/2)`);
      
      // Enhanced extraction with concurrent strategies
      const startTime = Date.now();
      
      const { data, error } = await Promise.race([
        supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              includeTimestamps: true,
              language: 'auto',
              format: 'enhanced',
              qualityLevel: 'high',
              multipleStrategies: true
            }
          }
        }),
        // Timeout after 30 seconds for faster user experience
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transcript extraction timeout')), 30000)
        )
      ]);

      if (error) {
        throw error;
      }

      const processingTime = Date.now() - startTime;

      if (data?.success && data?.transcript) {
        const transcriptLength = data.transcript.length;
        console.log(`✅ Transcript extracted: ${transcriptLength} chars in ${processingTime}ms via ${data.metadata?.extractionMethod}`);
        
        // Enhanced quality validation
        if (transcriptLength < 15) {
          throw new Error('Transcript too short - likely incomplete');
        }

        // Quality scoring
        const qualityScore = Math.min(100, Math.max(60, 
          (transcriptLength / 50) + (data.metadata?.segmentCount || 0) * 2
        ));

        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            processingTime,
            qualityScore: qualityScore.toFixed(1),
            transcriptionSpeed: (transcriptLength / (processingTime / 1000)).toFixed(1) + ' chars/sec',
            videoId,
            extractionTimestamp: new Date().toISOString()
          },
          provider: data.metadata?.extractionMethod || 'youtube-transcript'
        };
      } else {
        throw new Error(data?.error || 'No transcript data received');
      }
    } catch (error) {
      console.error(`❌ YouTube transcript failed (attempt ${retryCount + 1}):`, error);
      
      // Smart retry logic - only retry on transient errors
      if (retryCount === 0 && this.shouldRetry(error.message)) {
        console.log('🔄 Retrying with enhanced strategy...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchYouTubeTranscript(url, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message || 'YouTube transcript extraction failed',
        provider: 'youtube-transcript'
      };
    }
  }

  private static shouldRetry(errorMessage: string): boolean {
    const retryableErrors = ['timeout', 'network', 'rate limit', 'temporary'];
    return retryableErrors.some(error => 
      errorMessage.toLowerCase().includes(error)
    );
  }

  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}
