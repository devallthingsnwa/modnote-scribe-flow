
import { supabase } from "@/integrations/supabase/client";

export interface SpeechToTextResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

export class SpeechToTextService {
  static async transcribeAudio(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("Starting audio transcription with Whisper API");
      
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binary);
      
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { 
          audio: base64Audio,
          format: audioBlob.type || 'audio/webm'
        }
      });

      if (error) {
        console.error("Speech-to-text error:", error);
        throw new Error(error.message || 'Speech-to-text failed');
      }

      if (data?.text) {
        console.log("Speech-to-text successful:", data.text.length, "characters");
        return {
          success: true,
          text: data.text,
          confidence: data.confidence
        };
      }

      throw new Error('No transcription text received');
      
    } catch (error) {
      console.error("Speech-to-text service error:", error);
      return {
        success: false,
        error: error.message || 'Speech-to-text failed'
      };
    }
  }
}
