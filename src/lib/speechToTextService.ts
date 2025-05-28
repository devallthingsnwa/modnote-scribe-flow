
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
    console.log("Starting enhanced audio transcription with multiple fallbacks...");
    
    // Try Supadata first (primary)
    const supadataResult = await this.transcribeWithSupadata(audioBlob);
    if (supadataResult.success && supadataResult.text && supadataResult.text.trim().length > 0) {
      console.log("Supadata speech-to-text successful");
      return supadataResult;
    }
    
    console.warn("Supadata failed, trying OpenAI Whisper...");
    
    // Fallback to OpenAI Whisper (secondary)
    const whisperResult = await this.transcribeWithWhisper(audioBlob);
    if (whisperResult.success && whisperResult.text && whisperResult.text.trim().length > 0) {
      console.log("OpenAI Whisper speech-to-text successful");
      return whisperResult;
    }
    
    console.warn("OpenAI Whisper failed, trying direct OpenAI API...");
    
    // Final fallback - Direct OpenAI API call
    const directResult = await this.transcribeWithDirectOpenAI(audioBlob);
    if (directResult.success && directResult.text && directResult.text.trim().length > 0) {
      console.log("Direct OpenAI API speech-to-text successful");
      return directResult;
    }
    
    console.error("All speech-to-text providers failed");
    return {
      success: false,
      error: "All speech-to-text providers failed. Please check your internet connection and try again.",
      provider: "none"
    };
  }

  private static async transcribeWithSupadata(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("Attempting speech-to-text with Supadata API");
      
      // Convert blob to base64 with better error handling
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      if (uint8Array.length === 0) {
        throw new Error('Empty audio data');
      }
      
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
      console.log("Attempting speech-to-text with OpenAI Whisper via Edge Function");
      
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      if (uint8Array.length === 0) {
        throw new Error('Empty audio data');
      }
      
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

  private static async transcribeWithDirectOpenAI(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("Attempting speech-to-text with Direct OpenAI API");
      
      // Create FormData for direct API call
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || 'sk-placeholder'}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Direct OpenAI API error:", response.status, errorText);
        throw new Error(`Direct OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.text && result.text.trim().length > 0) {
        console.log("Direct OpenAI API successful:", result.text.length, "characters");
        
        // Calculate average confidence from segments if available
        let avgConfidence = undefined;
        if (result.segments && result.segments.length > 0) {
          const confidenceSum = result.segments.reduce((sum: number, segment: any) => {
            return sum + (segment.avg_logprob || 0);
          }, 0);
          avgConfidence = Math.exp(confidenceSum / result.segments.length);
        }
        
        return {
          success: true,
          text: result.text.trim(),
          confidence: avgConfidence,
          provider: 'openai-direct',
          metadata: {
            duration: result.duration,
            language: result.language
          }
        };
      }

      throw new Error('No transcription text received from Direct OpenAI API');
      
    } catch (error) {
      console.error("Direct OpenAI API service error:", error);
      return {
        success: false,
        error: error.message || 'Direct OpenAI API failed',
        provider: 'openai-direct'
      };
    }
  }

  // Enhanced retry mechanism
  static async transcribeWithRetry(audioBlob: Blob, maxRetries: number = 2): Promise<SpeechToTextResult> {
    let lastResult: SpeechToTextResult = { success: false, error: 'Unknown error' };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Speech-to-text attempt ${attempt}/${maxRetries}`);
      
      const result = await this.transcribeAudioWithFallback(audioBlob);
      
      if (result.success && result.text && result.text.trim().length > 0) {
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return lastResult;
  }

  // Legacy method for backward compatibility
  static async transcribeAudio(audioBlob: Blob): Promise<SpeechToTextResult> {
    return this.transcribeWithRetry(audioBlob, 2);
  }
}
