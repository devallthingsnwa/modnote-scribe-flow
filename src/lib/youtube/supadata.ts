
import { supabase } from "@/integrations/supabase/client";
import { SupadataResponse } from "./types";

export class SupadataService {
  static async fetchTranscript(videoId: string): Promise<SupadataResponse> {
    try {
      console.log(`🎯 Fetching transcript via Supadata for video: ${videoId}`);
      
      const { data, error } = await supabase.functions.invoke('supadata-transcript', {
        body: { 
          videoId,
          method: 'transcript',
          options: {
            includeTimestamps: true,
            language: 'auto'
          }
        }
      });

      if (error) {
        console.error("Supadata transcript error:", error);
        throw new Error(error.message || 'Supadata transcript service error');
      }

      if (data?.success && data?.transcript) {
        console.log("✅ Supadata transcript successful:", data.transcript.length, "characters");
        return {
          success: true,
          transcript: data.transcript,
          segments: data.segments,
          processingTime: data.processingTime
        };
      }

      throw new Error('No transcript available from Supadata');
      
    } catch (error) {
      console.error("❌ Supadata transcript failed:", error);
      return {
        success: false,
        error: error.message || 'Supadata transcript extraction failed'
      };
    }
  }

  static async transcribeAudio(videoId: string): Promise<SupadataResponse> {
    try {
      console.log(`🎵 Transcribing audio via Supadata for video: ${videoId}`);
      
      const { data, error } = await supabase.functions.invoke('supadata-transcript', {
        body: { 
          videoId,
          method: 'audio-transcription',
          options: {
            includeTimestamps: false,
            language: 'auto',
            audioQuality: 'high'
          }
        }
      });

      if (error) {
        console.error("Supadata audio transcription error:", error);
        throw new Error(error.message || 'Supadata audio transcription service error');
      }

      if (data?.success && data?.transcript) {
        console.log("✅ Supadata audio transcription successful:", data.transcript.length, "characters");
        return {
          success: true,
          transcript: data.transcript,
          processingTime: data.processingTime
        };
      }

      throw new Error('Audio transcription failed via Supadata');
      
    } catch (error) {
      console.error("❌ Supadata audio transcription failed:", error);
      return {
        success: false,
        error: error.message || 'Supadata audio transcription failed'
      };
    }
  }
}
