
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
        const metadataResult = await this.callEnhancedProcessor('fetch_metadata', videoId);
        if (metadataResult.success) {
          result.metadata = metadataResult.metadata;
        } else {
          console.warn('Failed to fetch metadata:', metadataResult.error);
        }
      }

      // Fetch transcript if requested
      if (fetchTranscript) {
        const transcriptResult = await this.callEnhancedProcessor('fetch_transcript', videoId);
        if (transcriptResult.success) {
          result.transcript = transcriptResult.transcript;
        } else {
          console.warn('Failed to fetch transcript:', transcriptResult.error);
          result.transcript = "Transcript not available for this video.";
        }
      }

      // Generate AI summary if requested
      if (generateSummary && result.transcript) {
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
      const result = await this.callEnhancedProcessor('save_note', '', { noteData });
      return result;
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
