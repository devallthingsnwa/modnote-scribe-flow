
import { supabase } from "@/integrations/supabase/client";
import { SpeechToTextResult } from "../types";

export class WhisperEdgeProvider {
  static async transcribe(audioBlob: Blob, base64Audio: string): Promise<SpeechToTextResult> {
    try {
      console.log("🔄 Attempting OpenAI Whisper Edge Function...");
      
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { 
          audio: base64Audio,
          format: audioBlob.type || 'audio/webm'
        }
      });

      if (error) {
        console.error("Whisper Edge Function error:", error);
        throw new Error(error.message || 'Whisper Edge Function error');
      }

      if (data?.text?.trim()) {
        console.log("✅ Whisper Edge Function successful:", data.text.length, "characters");
        return {
          success: true,
          text: data.text.trim(),
          confidence: data.confidence,
          provider: 'openai-whisper-edge',
          metadata: {
            duration: data.duration,
            language: data.language
          }
        };
      }

      throw new Error('No valid transcription from Whisper Edge Function');
      
    } catch (error) {
      console.error("❌ Whisper Edge Function failed:", error);
      return {
        success: false,
        error: error.message || 'Whisper Edge Function failed',
        provider: 'openai-whisper-edge'
      };
    }
  }
}
