import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult, YouTubeMetadata } from "./types";

export class YouTubeService {
  // Optimized metadata extraction with faster processing
  static async getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
    console.log(`📊 Fetching optimized metadata for video: ${videoId}`);
    
    try {
      // Fast parallel approach - try multiple sources simultaneously
      const metadataPromises = [
        this.fetchSupabaseMetadataFast(videoId),
        this.fetchOEmbedMetadataFast(videoId)
      ];

      // Race condition - use first successful result
      const results = await Promise.allSettled(metadataPromises);
      
      let metadata: YouTubeMetadata = {};
      let bestQuality = 'minimal';

      // Process results and pick the best one
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const currentMetadata = result.value;
          const quality = this.assessMetadataQuality(currentMetadata);
          
          if (this.isQualityBetter(quality, bestQuality)) {
            metadata = currentMetadata;
            bestQuality = quality;
          }
          
          // If we have high quality, stop processing
          if (quality === 'high') break;
        }
      }

      // Ensure minimum required data
      return this.ensureMinimumMetadata(metadata, videoId);

    } catch (error) {
      console.error('❌ All metadata extraction methods failed:', error);
      return this.createFallbackMetadata(videoId);
    }
  }

  private static async fetchSupabaseMetadataFast(videoId: string): Promise<YouTubeMetadata | null> {
    try {
      const { data, error } = await Promise.race([
        supabase.functions.invoke('youtube-metadata', { body: { videoId } }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Supabase metadata timeout')), 8000) // Reduced timeout
        )
      ]);

      if (error || !data || data.error) {
        return null;
      }

      return {
        title: data.title,
        author: data.author,
        description: data.description,
        duration: data.duration,
        thumbnail: data.thumbnail,
        publishedAt: data.publishedAt,
        viewCount: data.viewCount,
        tags: data.tags,
        metadataSource: 'supabase'
      };
    } catch (error) {
      console.warn('Supabase metadata failed:', error);
      return null;
    }
  }

  private static async fetchOEmbedMetadataFast(videoId: string): Promise<YouTubeMetadata | null> {
    try {
      const response = await Promise.race([
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('OEmbed timeout')), 5000) // Very fast timeout
        )
      ]);

      if (!response.ok) return null;

      const data = await response.json();
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url,
        duration: 'Unknown',
        metadataSource: 'oembed'
      };
    } catch (error) {
      console.warn('OEmbed metadata failed:', error);
      return null;
    }
  }

  private static assessMetadataQuality(metadata: YouTubeMetadata): 'high' | 'basic' | 'minimal' {
    const hasBasicInfo = metadata.title && metadata.author;
    const hasRichInfo = hasBasicInfo && metadata.description && metadata.duration && metadata.publishedAt;
    
    if (hasRichInfo) return 'high';
    if (hasBasicInfo) return 'basic';
    return 'minimal';
  }

  private static isQualityBetter(current: string, existing: string): boolean {
    const qualityRank = { 'high': 3, 'basic': 2, 'minimal': 1 };
    return qualityRank[current] > qualityRank[existing];
  }

  private static ensureMinimumMetadata(metadata: YouTubeMetadata, videoId: string): YouTubeMetadata {
    return {
      title: metadata.title || `YouTube Video ${videoId}`,
      author: metadata.author || 'Unknown',
      duration: metadata.duration || 'Unknown',
      thumbnail: metadata.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      ...metadata,
      metadataQuality: this.assessMetadataQuality(metadata),
      extractedAt: new Date().toISOString()
    };
  }

  private static createFallbackMetadata(videoId: string): YouTubeMetadata {
    return {
      title: `YouTube Video ${videoId}`,
      author: 'Unknown',
      duration: 'Unknown',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      metadataQuality: 'minimal',
      metadataSource: 'fallback',
      extractedAt: new Date().toISOString()
    };
  }

  static async fetchYouTubeTranscript(url: string, retryCount: number = 0): Promise<TranscriptionResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`🎥 Optimized YouTube transcript extraction for: ${videoId} (attempt ${retryCount + 1}/2)`);
      
      const startTime = Date.now();
      const timeout = 45000; // Reduced timeout for faster processing
      
      const { data, error } = await Promise.race([
        supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              includeTimestamps: false, // Faster without timestamps
              language: 'auto',
              format: 'text',
              qualityLevel: 'high',
              fastMode: true,
              retryCount
            }
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Optimized transcript timeout (${timeout/1000}s)`)), timeout)
        )
      ]);

      if (error) {
        throw error;
      }

      const processingTime = Date.now() - startTime;

      if (data?.success && data?.transcript) {
        const transcriptLength = data.transcript.length;
        console.log(`✅ Optimized transcript extracted: ${transcriptLength} chars in ${processingTime}ms`);
        
        if (transcriptLength < 10) {
          throw new Error('Transcript too short - likely incomplete');
        }

        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            processingTime,
            transcriptionSpeed: (transcriptLength / (processingTime / 1000)).toFixed(1) + ' chars/sec',
            videoId,
            extractionTimestamp: new Date().toISOString(),
            retryCount,
            optimized: true
          },
          provider: data.metadata?.extractionMethod || 'youtube-transcript-optimized'
        };
      } else {
        throw new Error(data?.error || 'No transcript data received');
      }
    } catch (error) {
      console.error(`❌ Optimized YouTube transcript failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < 1 && this.shouldRetry(error.message)) {
        console.log('🔄 Quick retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Faster retry
        return this.fetchYouTubeTranscript(url, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message || 'YouTube transcript extraction failed',
        provider: 'youtube-transcript-optimized',
        metadata: {
          retryCount,
          extractionTimestamp: new Date().toISOString(),
          optimized: true
        }
      };
    }
  }

  private static shouldRetry(errorMessage: string): boolean {
    const retryableErrors = ['timeout', 'network', 'temporary', 'processing'];
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
