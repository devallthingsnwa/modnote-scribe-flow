
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

      // Enhanced transcript fetching with better error handling
      if (fetchTranscript) {
        try {
          console.log(`Attempting to fetch transcript for video: ${videoId}`);
          
          const { data: transcriptResult, error: transcriptError } = await supabase.functions.invoke('fetch-youtube-transcript', {
            body: { 
              videoId,
              options: {
                includeTimestamps: true,
                language: 'en',
                format: 'text',
                maxRetries: 3,
                ...transcriptOptions
              }
            }
          });
          
          if (transcriptError) {
            console.error('Supabase function error during transcript fetch:', transcriptError);
            result.transcript = "Transcript not available for this video. You can add your own notes here.";
          } else if (transcriptResult) {
            console.log('Transcript response received:', {
              success: transcriptResult.success,
              hasTranscript: !!transcriptResult.transcript,
              transcriptLength: transcriptResult.transcript?.length || 0
            });
            
            if (transcriptResult.success && transcriptResult.transcript) {
              const transcriptContent = transcriptResult.transcript.trim();
              if (transcriptContent && transcriptContent.length > 20) {
                result.transcript = transcriptContent;
                result.segments = transcriptResult.segments || [];
                console.log(`Enhanced transcript fetched successfully: ${transcriptContent.length} characters`);
              } else {
                console.warn('Transcript content is too short or empty');
                result.transcript = "Transcript appears to be empty. You can add your own notes here.";
              }
            } else {
              console.warn('Transcript fetch was not successful:', transcriptResult.error);
              result.transcript = transcriptResult.transcript || "Transcript not available for this video. You can add your own notes here.";
            }
          } else {
            console.warn('No transcript response received');
            result.transcript = "No response from transcript service. You can add your own notes here.";
          }
        } catch (error) {
          console.error('Error during transcript fetch:', error);
          result.transcript = "Error fetching transcript. You can add your own notes here.";
        }
      }

      // Generate AI summary if requested and we have valid transcript
      if (generateSummary && result.transcript && !result.transcript.includes("You can add your own notes here")) {
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
