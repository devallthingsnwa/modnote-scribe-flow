
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
    thumbnail?: string;
  };
  transcript?: string;
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
        summaryType = 'full'
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
            console.warn('Failed to fetch metadata:', metadataError);
          } else if (metadataResult) {
            result.metadata = {
              title: metadataResult.title || `YouTube Video ${videoId}`,
              author: metadataResult.author || 'Unknown',
              duration: metadataResult.duration || 'Unknown',
              viewCount: metadataResult.viewCount,
              description: metadataResult.description,
              thumbnail: metadataResult.thumbnail || this.generateThumbnailUrl(videoId)
            };
            console.log('Metadata fetched successfully:', result.metadata);
          }
        } catch (error) {
          console.warn('Failed to fetch metadata:', error);
          // Provide fallback metadata
          result.metadata = {
            title: `YouTube Video ${videoId}`,
            author: 'Unknown',
            duration: 'Unknown',
            thumbnail: this.generateThumbnailUrl(videoId)
          };
        }
      }

      // Fetch transcript if requested - this is the priority
      if (fetchTranscript) {
        try {
          console.log(`Fetching transcript for video: ${videoId}`);
          const { data: transcriptResult, error: transcriptError } = await supabase.functions.invoke('fetch-youtube-transcript', {
            body: { videoId }
          });
          
          if (transcriptError) {
            console.error('Error fetching transcript:', transcriptError);
            result.transcript = "Transcript not available for this video. You can add your own notes here.";
          } else if (transcriptResult?.transcript) {
            result.transcript = transcriptResult.transcript;
            console.log(`Transcript fetched successfully: ${transcriptResult.transcript.length} characters`);
          } else {
            console.warn('No transcript returned from function');
            result.transcript = "Transcript not available for this video. You can add your own notes here.";
          }
        } catch (error) {
          console.error('Error fetching transcript:', error);
          result.transcript = "Transcript not available for this video. You can add your own notes here.";
        }
      }

      // Generate AI summary if requested
      if (generateSummary && result.transcript && result.transcript !== "Transcript not available for this video. You can add your own notes here.") {
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
