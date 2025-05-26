import { supabase } from "@/integrations/supabase/client";

export interface VideoProcessingOptions {
  fetchMetadata?: boolean;
  fetchTranscript?: boolean;
  generateSummary?: boolean;
  summaryType?: 'full' | 'keypoints' | 'chapters' | 'concepts';
}

export interface VideoProcessingResult {
  success: boolean;
  metadata?: {
    title: string;
    author: string;
    duration: string;
    viewCount?: string;
    description?: string;
  };
  transcript?: string;
  summary?: string;
  error?: string;
}

export class VideoNoteProcessor {
  private static async callEnhancedProcessor(action: string, videoId: string, options?: any): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-youtube-processor', {
        body: { videoId, action, options }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error calling enhanced processor with action ${action}:`, error);
      throw error;
    }
  }

  static async processVideo(
    videoId: string, 
    options: VideoProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    try {
      const {
        fetchMetadata = true,
        fetchTranscript = true,
        generateSummary = false,
        summaryType = 'full'
      } = options;

      let result: VideoProcessingResult = { success: true };

      // Fetch metadata if requested
      if (fetchMetadata) {
        try {
          const metadataResult = await this.callEnhancedProcessor('fetch_metadata', videoId);
          if (metadataResult.success) {
            result.metadata = metadataResult.metadata;
          }
        } catch (error) {
          console.warn('Failed to fetch metadata:', error);
        }
      }

      // Fetch transcript if requested - this is the priority
      if (fetchTranscript) {
        try {
          // Try the enhanced processor first
          const transcriptResult = await this.callEnhancedProcessor('fetch_transcript', videoId);
          if (transcriptResult.success && transcriptResult.transcript) {
            result.transcript = transcriptResult.transcript;
          } else {
            // Fallback to the original transcript function
            const fallbackResult = await supabase.functions.invoke('fetch-youtube-transcript', {
              body: { videoId }
            });
            
            if (fallbackResult.data?.transcript) {
              result.transcript = fallbackResult.data.transcript;
            } else {
              console.warn('No transcript available from either method');
              result.transcript = "Transcript not available for this video. You can add your own notes here.";
            }
          }
        } catch (error) {
          console.error('Error fetching transcript:', error);
          result.transcript = "Transcript not available for this video. You can add your own notes here.";
        }
      }

      // Generate AI summary if requested (keeping this for future use)
      if (generateSummary && result.transcript && result.transcript !== "Transcript not available for this video. You can add your own notes here.") {
        try {
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
      // Use Supabase client directly for better error handling
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
