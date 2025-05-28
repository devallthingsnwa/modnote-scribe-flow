
import { supabase } from "@/integrations/supabase/client";

export interface SpeechToTextResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
  provider?: string;
  metadata?: {
    duration?: number;
    language?: string;
    processingTime?: number;
  };
}

export class SpeechToTextService {
  static async transcribeAudioWithFallback(audioBlob: Blob): Promise<SpeechToTextResult> {
    console.log("Starting audio transcription with Supadata priority fallback...");
    
    // Try Supadata first
    const supadataResult = await this.transcribeWithSupadata(audioBlob);
    if (supadataResult.success) {
      console.log("Supadata speech-to-text successful");
      return supadataResult;
    }
    
    console.warn("Supadata speech-to-text failed, falling back to OpenAI Whisper...");
    
    // Fallback to OpenAI Whisper
    const whisperResult = await this.transcribeWithWhisper(audioBlob);
    if (whisperResult.success) {
      console.log("OpenAI Whisper speech-to-text successful");
      return whisperResult;
    }
    
    console.error("All speech-to-text providers failed");
    return {
      success: false,
      error: "All speech-to-text providers failed. Please try again later.",
      provider: "none"
    };
  }

  private static async transcribeWithSupadata(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("Attempting speech-to-text with Supadata API");
      
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
      
      const { data, error } = await supabase.functions.invoke('supadata-speech-to-text', {
        body: { 
          audio: base64Audio,
          format: audioBlob.type || 'audio/webm',
          options: {
            language: 'en',
            include_confidence: true,
            include_timestamps: false
          }
        }
      });

      if (error) {
        console.error("Supadata speech-to-text error:", error);
        throw new Error(error.message || 'Supadata speech-to-text failed');
      }

      if (data?.text && data.text.trim().length > 0) {
        console.log("Supadata speech-to-text successful:", data.text.length, "characters");
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

      throw new Error('No transcription text received from Supadata');
      
    } catch (error) {
      console.error("Supadata speech-to-text service error:", error);
      return {
        success: false,
        error: error.message || 'Supadata speech-to-text failed',
        provider: 'supadata'
      };
    }
  }

  private static async transcribeWithWhisper(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("Attempting speech-to-text with OpenAI Whisper");
      
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
        console.error("OpenAI Whisper error:", error);
        throw new Error(error.message || 'OpenAI Whisper failed');
      }

      if (data?.text && data.text.trim().length > 0) {
        console.log("OpenAI Whisper successful:", data.text.length, "characters");
        return {
          success: true,
          text: data.text.trim(),
          confidence: data.confidence,
          provider: 'openai-whisper',
          metadata: {
            duration: data.duration,
            language: data.language
          }
        };
      }

      throw new Error('No transcription text received from OpenAI Whisper');
      
    } catch (error) {
      console.error("OpenAI Whisper service error:", error);
      return {
        success: false,
        error: error.message || 'OpenAI Whisper failed',
        provider: 'openai-whisper'
      };
    }
  }

  // Legacy method for backward compatibility
  static async transcribeAudio(audioBlob: Blob): Promise<SpeechToTextResult> {
    return this.transcribeAudioWithFallback(audioBlob);
  }
}
