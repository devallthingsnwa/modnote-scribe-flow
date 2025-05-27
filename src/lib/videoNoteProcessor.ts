import { supabase } from "@/integrations/supabase/client";

export interface VideoProcessingOptions {
  fetchMetadata?: boolean;
  fetchTranscript?: boolean;
  generateSummary?: boolean;
  summaryType?: 'full' | 'keypoints' | 'chapters' | 'concepts';
  transcriptOptions?: {
    includeTimestamps?: boolean;
    language?: string;
    format?: 'text' | 'json' | 'srt';
    maxRetries?: number;
  };
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
  speaker?: string;
}

export interface VideoProcessingResult {
  success: boolean;
  metadata?: {
    title: string;
    author: string;
    duration: string;
    viewCount?: string;
    description?: string;
    thumbnail?: string;
  };
  transcript?: string;
  segments?: TranscriptSegment[];
  summary?: string;
  error?: string;
}

export class VideoNoteProcessor {
  static async processVideo(
    videoId: string, 
    options: VideoProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    try {
      const {
        fetchMetadata = true,
        fetchTranscript = true,
        generateSummary = false,
        summaryType = 'full',
        transcriptOptions = {}
      } = options;

      let result: VideoProcessingResult = { success: true };

      // Fetch metadata if requested
      if (fetchMetadata) {
        try {
          console.log(`Fetching metadata for video: ${videoId}`);
          const { data: metadataResult, error: metadataError } = await supabase.functions.invoke('youtube-metadata', {
            body: { videoId }
          });
          
          if (metadataError) {
            console.warn('Metadata fetch error:', metadataError);
            result.metadata = {
              title: await this.fetchVideoTitleFromHTML(videoId) || `YouTube Video ${videoId}`,
              author: 'Unknown',
              duration: 'Unknown',
              thumbnail: this.generateThumbnailUrl(videoId)
            };
          } else if (metadataResult && !metadataResult.error) {
            result.metadata = {
              title: metadataResult.title || `YouTube Video ${videoId}`,
              author: metadataResult.author || 'Unknown',
              duration: metadataResult.duration || 'Unknown',
              viewCount: metadataResult.viewCount,
              description: metadataResult.description,
              thumbnail: metadataResult.thumbnail || this.generateThumbnailUrl(videoId)
            };
            console.log('Metadata fetched successfully:', result.metadata);
          } else {
            result.metadata = {
              title: await this.fetchVideoTitleFromHTML(videoId) || `YouTube Video ${videoId}`,
              author: 'Unknown',
              duration: 'Unknown',
              thumbnail: this.generateThumbnailUrl(videoId)
            };
          }
        } catch (error) {
          console.warn('Failed to fetch metadata:', error);
          result.metadata = {
            title: await this.fetchVideoTitleFromHTML(videoId) || `YouTube Video ${videoId}`,
            author: 'Unknown',
            duration: 'Unknown',
            thumbnail: this.generateThumbnailUrl(videoId)
          };
        }
      }

      // Enhanced transcript fetching with multiple retry attempts
      if (fetchTranscript) {
        result.transcript = await this.fetchTranscriptWithRetries(videoId, transcriptOptions);
      }

      // Generate AI summary if requested and we have valid transcript
      if (generateSummary && result.transcript && this.isValidTranscript(result.transcript)) {
        try {
          console.log('Generating AI summary...');
          const summaryResult = await supabase.functions.invoke('process-content-with-deepseek', {
            body: {
              content: result.transcript,
              type: 'video',
              options: {
                summary: summaryType === 'full' || summaryType === 'chapters',
                highlights: summaryType === 'keypoints' || summaryType === 'full',
                keyPoints: summaryType === 'keypoints' || summaryType === 'concepts',
              }
            }
          });

          if (summaryResult.data?.processedContent) {
            result.summary = summaryResult.data.processedContent;
            console.log('AI summary generated successfully');
          }
        } catch (error) {
          console.warn('Failed to generate AI summary:', error);
        }
      }

      return result;
    } catch (error) {
      console.error('Error processing video:', error);
      return {
        success: false,
        error: error.message || 'Failed to process video'
      };
    }
  }

  private static async fetchTranscriptWithRetries(
    videoId: string, 
    options: any = {}
  ): Promise<string> {
    const maxRetries = options.maxRetries || 3;
    let lastError: string = '';
    const delays = [1000, 2000, 4000]; // Exponential backoff

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Transcript fetch attempt ${attempt} for video: ${videoId}`);
        
        const { data: transcriptResult, error: transcriptError } = await supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              includeTimestamps: true,
              language: 'en',
              format: 'text',
              ...options
            }
          }
        });
        
        if (transcriptError) {
          lastError = `Supabase function error: ${transcriptError.message}`;
          console.error('Supabase function error during transcript fetch:', transcriptError);
          
          // If it's the last attempt, continue to return fallback
          if (attempt === maxRetries) break;
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1] || 5000));
          continue;
        }

        if (transcriptResult) {
          console.log('Transcript response received:', {
            success: transcriptResult.success,
            hasTranscript: !!transcriptResult.transcript,
            transcriptLength: transcriptResult.transcript?.length || 0
          });
          
          if (transcriptResult.success && transcriptResult.transcript) {
            const transcriptContent = transcriptResult.transcript.trim();
            if (this.isValidTranscript(transcriptContent)) {
              console.log(`Successfully fetched transcript: ${transcriptContent.length} characters`);
              return transcriptContent;
            }
          }
          
          // If we got a response but it indicates failure, log it and save it
          if (transcriptResult.transcript) {
            lastError = transcriptResult.error || 'Invalid transcript content';
            console.warn('Transcript fetch indicated failure:', lastError);
            return transcriptResult.transcript; // Return even failed transcript as it might have useful info
          }
        }

        lastError = 'No transcript response received';
        console.warn('No transcript response received on attempt', attempt);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1] || 5000));
        }
        
      } catch (error: any) {
        lastError = error.message || 'Unknown error';
        console.error(`Error during transcript fetch attempt ${attempt}:`, error);
        
        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1] || 5000));
        }
      }
    }

    // All attempts failed, return user-friendly message with more detail
    console.error(`All ${maxRetries} transcript fetch attempts failed. Last error:`, lastError);
    return lastError.includes('captions') || lastError.includes('transcript') ?
      `Transcript could not be fetched. This video may not have captions available. Error: ${lastError}` :
      `Transcript could not be fetched after ${maxRetries} attempts. Please try again later. Error: ${lastError}`;
  }

  private static isValidTranscript(transcript: string): boolean {
    if (!transcript || typeof transcript !== 'string') return false;
    
    const trimmed = transcript.trim();
    
    // Check if it's a meaningful transcript (not just error messages)
    const errorMessages = [
      'You can add your own notes here',
      'Transcript not available',
      'No transcript available',
      'Unable to fetch transcript',
      'Error fetching transcript',
      'could not be fetched',
      'Please try again later'
    ];
    
    const hasErrorMessage = errorMessages.some(msg => 
      trimmed.toLowerCase().includes(msg.toLowerCase())
    );
    
    // Require minimum length and proper formatting
    const hasTimestamps = trimmed.includes('[') && trimmed.includes(']');
    const hasMultipleLines = trimmed.split('\n').length > 3;
    const hasMinimumLength = trimmed.length > 100;
    
    return !hasErrorMessage && (hasTimestamps || hasMultipleLines) && hasMinimumLength;
  }

  // New method to fetch video title from HTML as fallback
  static async fetchVideoTitleFromHTML(videoId: string): Promise<string | null> {
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) return null;
      
      const html = await response.text();
      
      // Try to extract title from various meta tags
      const patterns = [
        /<meta property="og:title" content="([^"]*)"[^>]*>/,
        /<meta name="title" content="([^"]*)"[^>]*>/,
        /<title>([^<]*)<\/title>/
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let title = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/ - YouTube$/, '')
            .trim();
          
          if (title && title.length > 0) {
            console.log('Extracted title from HTML:', title);
            return title;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to fetch title from HTML:', error);
      return null;
    }
  }

  static async saveVideoNote(noteData: {
    id?: string;
    title: string;
    content: string | null;
    source_url: string;
    thumbnail?: string;
    is_transcription: boolean;
    user_id: string;
  }): Promise<{ success: boolean; noteId?: string; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const notePayload = {
        ...noteData,
        user_id: userData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notes')
        .insert([notePayload])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        noteId: data.id
      };
    } catch (error) {
      console.error('Error saving video note:', error);
      return {
        success: false,
        error: error.message || 'Failed to save note'
      };
    }
  }

  static extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  static generateThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
    const qualityMap = {
      'default': 'default.jpg',
      'medium': 'mqdefault.jpg', 
      'high': 'hqdefault.jpg',
      'maxres': 'maxresdefault.jpg'
    };
    
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
  }

  static formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
