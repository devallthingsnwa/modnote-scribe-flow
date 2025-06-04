
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult } from "./types";

export class YouTubeAudioService {
  static async extractAudioAndTranscribe(videoId: string): Promise<TranscriptionResult> {
    try {
      console.log(`Starting enhanced audio extraction and transcription for video: ${videoId}`);
      
      // Call edge function to extract audio and transcribe with enhanced instructions
      const { data, error } = await supabase.functions.invoke('youtube-audio-transcription', {
        body: { 
          videoId,
          options: {
            audioFormat: 'mp3',
            quality: 'medium',
            language: 'en',
            instructions: "Extract and transcribe all the words spoken in this YouTube video into a clean, readable transcript. Ignore background noise and non-speech sounds. Return only the spoken text.",
            focus_on_speech: true,
            remove_background_noise: true
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
            extractionMethod: 'youtube-audio-enhanced',
            audioQuality: data.audioQuality,
            processingTime: data.processingTime,
            instructions_used: "Clean speech-only transcription"
          },
          provider: 'enhanced-audio-transcription'
        };
      } else {
        throw new Error(data?.error || 'No transcript data received from enhanced audio extraction');
      }
    } catch (error) {
      console.error('YouTube enhanced audio extraction failed:', error);
      return {
        success: false,
        error: error.message || 'YouTube enhanced audio extraction and transcription failed',
        provider: 'enhanced-audio-transcription'
      };
    }
  }
}
