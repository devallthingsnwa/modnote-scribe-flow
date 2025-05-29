
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult } from "./types";

export class YouTubeAudioService {
  static async extractAudioAndTranscribe(videoId: string): Promise<TranscriptionResult> {
    try {
      console.log(`Starting audio extraction and transcription for video: ${videoId}`);
      
      // Call edge function to extract audio and transcribe with Supadata
      const { data, error } = await supabase.functions.invoke('youtube-audio-transcription', {
        body: { 
          videoId,
          options: {
            audioFormat: 'mp3',
            quality: 'medium',
            language: 'en'
          }
        }
      });

      if (error) {
        console.error('YouTube audio transcription error:', error);
        throw new Error(error.message || 'Failed to extract and transcribe audio');
      }

      if (data?.success && data?.transcript) {
        console.log(`Audio transcription successful: ${data.transcript.length} characters`);
        
        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            extractionMethod: 'youtube-audio-supadata',
            audioQuality: data.audioQuality,
            processingTime: data.processingTime
          },
          provider: 'supadata-audio'
        };
      } else {
        throw new Error(data?.error || 'No transcript data received from audio extraction');
      }
    } catch (error) {
      console.error('YouTube audio extraction failed:', error);
      return {
        success: false,
        error: error.message || 'YouTube audio extraction and transcription failed',
        provider: 'supadata-audio'
      };
    }
  }
}
