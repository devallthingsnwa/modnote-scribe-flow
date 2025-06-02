
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

      console.log(`🎥 Enhanced YouTube transcript extraction for: ${videoId} (attempt ${retryCount + 1}/3)`);
      
      // Enhanced extraction with longer timeout for longer videos
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
              multipleStrategies: true,
              extendedTimeout: true, // Enable extended timeout for longer videos
              chunkProcessing: true  // Enable chunked processing
            }
          }
        }),
        // Extended timeout for longer videos (2 minutes instead of 30 seconds)
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Extended transcript extraction timeout (2 min)')), 120000)
        )
      ]);

      if (error) {
        throw error;
      }

      const processingTime = Date.now() - startTime;

      if (data?.success && data?.transcript) {
        const transcriptLength = data.transcript.length;
        console.log(`✅ Transcript extracted: ${transcriptLength} chars in ${processingTime}ms via ${data.metadata?.extractionMethod}`);
        
        // Enhanced quality validation for longer videos
        if (transcriptLength < 10) {
          throw new Error('Transcript too short - likely incomplete');
        }

        // Quality scoring with bonus for longer content
        const lengthBonus = Math.min(20, transcriptLength / 1000); // Bonus for longer transcripts
        const qualityScore = Math.min(100, Math.max(60, 
          (transcriptLength / 50) + (data.metadata?.segmentCount || 0) * 2 + lengthBonus
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
            extractionTimestamp: new Date().toISOString(),
            isLongVideo: transcriptLength > 5000 // Flag for long videos
          },
          provider: data.metadata?.extractionMethod || 'youtube-transcript'
        };
      } else {
        throw new Error(data?.error || 'No transcript data received');
      }
    } catch (error) {
      console.error(`❌ YouTube transcript failed (attempt ${retryCount + 1}):`, error);
      
      // Enhanced retry logic for longer videos
      if (retryCount < 2 && this.shouldRetry(error.message)) {
        console.log('🔄 Retrying with enhanced strategy for longer video...');
        // Exponential backoff with longer delays for longer videos
        const delay = retryCount === 0 ? 3000 : 8000; 
        await new Promise(resolve => setTimeout(resolve, delay));
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
    const retryableErrors = ['timeout', 'network', 'rate limit', 'temporary', 'processing'];
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
