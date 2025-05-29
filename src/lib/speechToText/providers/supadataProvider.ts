
import { supabase } from "@/integrations/supabase/client";
import { SpeechToTextResult, TranscriptionOptions } from "../types";

export class SupadataProvider {
  static async transcribe(audioBlob: Blob, base64Audio: string, options: TranscriptionOptions = {}): Promise<SpeechToTextResult> {
    try {
      console.log("🔄 Attempting Supadata transcription...");
      
      const { data, error } = await supabase.functions.invoke('supadata-speech-to-text', {
        body: { 
          audio: base64Audio,
          format: audioBlob.type || 'audio/webm',
          options: {
            language: options.language || 'en',
            include_confidence: options.include_confidence ?? true,
            include_timestamps: options.include_timestamps ?? false
          }
        }
      });

      if (error) {
        console.error("Supadata error:", error);
        throw new Error(error.message || 'Supadata service error');
      }

      if (data?.success && data?.text?.trim()) {
        console.log("✅ Supadata successful:", data.text.length, "characters");
        return {
          success: true,
          text: data.text.trim(),
          confidence: data.confidence,
          provider: 'supadata',
          metadata: {
            duration: data.duration,
            language: data.language,
            processingTime: data.processing_time
          }
        };
      }

      throw new Error('No valid transcription from Supadata');
      
    } catch (error) {
      console.error("❌ Supadata failed:", error);
      return {
        success: false,
        error: error.message || 'Supadata transcription failed',
        provider: 'supadata'
      };
    }
  }
}
