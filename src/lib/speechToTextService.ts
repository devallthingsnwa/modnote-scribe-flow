
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
    console.log("Starting audio transcription with enhanced fallback system...");
    
    // Convert blob to base64 once for all providers
    const base64Audio = await this.convertBlobToBase64(audioBlob);
    
    // Try Supadata first (primary)
    const supadataResult = await this.transcribeWithSupadata(audioBlob, base64Audio);
    if (supadataResult.success && supadataResult.text?.trim()) {
      console.log("✅ Supadata speech-to-text successful");
      return supadataResult;
    }
    
    console.warn("⚠️ Supadata failed, trying OpenAI Whisper Edge Function...");
    
    // Fallback to OpenAI Whisper via Edge Function
    const whisperResult = await this.transcribeWithWhisper(audioBlob, base64Audio);
    if (whisperResult.success && whisperResult.text?.trim()) {
      console.log("✅ OpenAI Whisper Edge Function successful");
      return whisperResult;
    }
    
    console.warn("⚠️ Edge Function failed, trying Direct OpenAI API...");
    
    // Final fallback - Direct OpenAI API call
    const directResult = await this.transcribeWithDirectOpenAI(audioBlob);
    if (directResult.success && directResult.text?.trim()) {
      console.log("✅ Direct OpenAI API successful");
      return directResult;
    }
    
    console.error("❌ All speech-to-text providers failed");
    return {
      success: false,
      error: "All speech-to-text providers failed. Please check your audio quality and internet connection.",
      provider: "none"
    };
  }

  private static async convertBlobToBase64(audioBlob: Blob): Promise<string> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      if (uint8Array.length === 0) {
        throw new Error('Empty audio data');
      }
      
      // Convert to base64 in chunks to handle large files
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      return btoa(binary);
    } catch (error) {
      console.error("Base64 conversion error:", error);
      throw new Error('Failed to process audio data');
    }
  }

  private static async transcribeWithSupadata(audioBlob: Blob, base64Audio: string): Promise<SpeechToTextResult> {
    try {
      console.log("🔄 Attempting Supadata transcription...");
      
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

  private static async transcribeWithWhisper(audioBlob: Blob, base64Audio: string): Promise<SpeechToTextResult> {
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

  private static async transcribeWithDirectOpenAI(audioBlob: Blob): Promise<SpeechToTextResult> {
    try {
      console.log("🔄 Attempting Direct OpenAI API...");
      
      // Get OpenAI API key from environment
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!openaiApiKey || openaiApiKey === 'sk-placeholder') {
        throw new Error('OpenAI API key not configured');
      }
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Direct OpenAI API error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.text?.trim()) {
        console.log("✅ Direct OpenAI API successful:", result.text.length, "characters");
        
        // Calculate confidence from segments if available
        let avgConfidence = undefined;
        if (result.segments?.length > 0) {
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

      throw new Error('No valid transcription from Direct OpenAI API');
      
    } catch (error) {
      console.error("❌ Direct OpenAI API failed:", error);
      return {
        success: false,
        error: error.message || 'Direct OpenAI API failed',
        provider: 'openai-direct'
      };
    }
  }

  // Enhanced retry mechanism with exponential backoff
  static async transcribeWithRetry(audioBlob: Blob, maxRetries: number = 2): Promise<SpeechToTextResult> {
    let lastResult: SpeechToTextResult = { success: false, error: 'Unknown error' };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Speech-to-text attempt ${attempt}/${maxRetries}`);
      
      const result = await this.transcribeAudioWithFallback(audioBlob);
      
      if (result.success && result.text?.trim()) {
        return result;
      }
      
      lastResult = result;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⏳ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return lastResult;
  }

  // Legacy method for backward compatibility
  static async transcribeAudio(audioBlob: Blob): Promise<SpeechToTextResult> {
    return this.transcribeWithRetry(audioBlob, 2);
  }
}
