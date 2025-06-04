
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult, YouTubeMetadata } from "./types";
import { YouTubeAudioService } from "./youtubeAudioService";

export class YouTubeService {
  // Enhanced metadata extraction with multiple sources and better error handling
  static async getYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
    console.log(`📊 Fetching enhanced metadata for video: ${videoId}`);
    
    try {
      // Try multiple metadata sources in parallel with timeout protection
      const metadataPromises = [
        // Primary: Supabase function with YouTube API
        this.fetchSupabaseMetadata(videoId),
        // Fallback: Direct oembed API (faster but less data)
        this.fetchOEmbedMetadata(videoId)
      ];

      const results = await Promise.allSettled(metadataPromises);
      let metadata: YouTubeMetadata = {};

      // Process results in priority order
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          metadata = { ...metadata, ...result.value };
          if (metadata.title && metadata.author) {
            break; // We have enough data
          }
        }
      }

      // Ensure we have at least basic metadata
      if (!metadata.title) {
        metadata.title = `YouTube Video ${videoId}`;
      }
      if (!metadata.author) {
        metadata.author = 'Unknown';
      }
      if (!metadata.thumbnail) {
        metadata.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }

      metadata.metadataQuality = this.assessMetadataQuality(metadata);
      metadata.extractedAt = new Date().toISOString();

      return metadata;
    } catch (error) {
      console.error('❌ All metadata extraction methods failed:', error);
      return this.createFallbackMetadata(videoId);
    }
  }

  private static async fetchSupabaseMetadata(videoId: string): Promise<YouTubeMetadata | null> {
    try {
      const { data, error } = await Promise.race([
        supabase.functions.invoke('youtube-metadata', { body: { videoId } }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Supabase metadata timeout')), 15000)
        )
      ]);

      if (error || !data || data.error) {
        throw new Error(error?.message || data?.error || 'Supabase metadata failed');
      }

      return {
        title: data.title,
        author: data.author,
        description: data.description,
        duration: data.duration,
        thumbnail: data.thumbnail,
        publishedAt: data.publishedAt,
        viewCount: data.viewCount,
        tags: data.tags
      };
    } catch (error) {
      console.warn('Supabase metadata failed:', error);
      return null;
    }
  }

  private static async fetchOEmbedMetadata(videoId: string): Promise<YouTubeMetadata | null> {
    try {
      const response = await Promise.race([
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('OEmbed timeout')), 10000)
        )
      ]);

      if (!response.ok) return null;

      const data = await response.json();
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url,
        duration: 'Unknown'
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

  private static createFallbackMetadata(videoId: string): YouTubeMetadata {
    return {
      title: `YouTube Video ${videoId}`,
      author: 'Unknown',
      duration: 'Unknown',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      metadataQuality: 'minimal',
      extractedAt: new Date().toISOString()
    };
  }

  static async fetchYouTubeTranscript(url: string, retryCount: number = 0): Promise<TranscriptionResult> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log(`🎥 Enhanced YouTube transcript extraction for: ${videoId} (attempt ${retryCount + 1}/3)`);
      
      const startTime = Date.now();
      const timeout = retryCount > 0 ? 180000 : 120000; // Increase timeout on retries
      
      const { data, error } = await Promise.race([
        supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              includeTimestamps: true,
              language: 'auto',
              format: 'enhanced',
              qualityLevel: 'high',
              multipleStrategies: true,
              extendedTimeout: retryCount > 0,
              chunkProcessing: true,
              retryCount
            }
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Extended transcript timeout (${timeout/1000}s)`)), timeout)
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
        if (transcriptLength < 10) {
          throw new Error('Transcript too short - likely incomplete');
        }

        const qualityScore = this.calculateTranscriptQuality(data.transcript, data.metadata);

        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            processingTime,
            qualityScore: qualityScore.toFixed(1),
            transcriptionSpeed: (transcriptLength / (processingTime / 1000)).toFixed(1) + ' chars/sec',
            videoId,
            extractionTimestamp: new Date().toISOString(),
            retryCount,
            confidenceScore: qualityScore
          },
          provider: data.metadata?.extractionMethod || 'youtube-transcript'
        };
      } else {
        throw new Error(data?.error || 'No transcript data received');
      }
    } catch (error) {
      console.error(`❌ YouTube transcript failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < 2 && this.shouldRetry(error.message)) {
        console.log('🔄 Retrying with enhanced strategy...');
        const delay = retryCount === 0 ? 3000 : 8000; 
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchYouTubeTranscript(url, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message || 'YouTube transcript extraction failed',
        provider: 'youtube-transcript',
        metadata: {
          retryCount,
          extractionTimestamp: new Date().toISOString()
        }
      };
    }
  }

  private static calculateTranscriptQuality(transcript: string, metadata: any): number {
    let score = 50; // Base score
    
    // Length factor
    const length = transcript.length;
    if (length > 5000) score += 20;
    else if (length > 2000) score += 15;
    else if (length > 500) score += 10;
    
    // Segment count factor
    const segmentCount = metadata?.segmentCount || 0;
    if (segmentCount > 100) score += 15;
    else if (segmentCount > 50) score += 10;
    else if (segmentCount > 20) score += 5;
    
    // Text quality indicators
    if (transcript.includes('[') && transcript.includes(']')) score += 10; // Timestamps
    if (transcript.match(/\./g)?.length > 10) score += 5; // Sentences
    if (transcript.match(/[A-Z]/g)?.length > 20) score += 5; // Proper capitalization
    
    return Math.min(100, Math.max(0, score));
  }

  private static shouldRetry(errorMessage: string): boolean {
    const retryableErrors = ['timeout', 'network', 'rate limit', 'temporary', 'processing', 'connection'];
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
