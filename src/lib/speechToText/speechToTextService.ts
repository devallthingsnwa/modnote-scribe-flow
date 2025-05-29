
import { SpeechToTextResult, TranscriptionOptions } from "./types";
import { AudioUtils } from "./audioUtils";
import { SupadataProvider } from "./providers/supadataProvider";
import { WhisperEdgeProvider } from "./providers/whisperEdgeProvider";
import { OpenAIDirectProvider } from "./providers/openaiDirectProvider";

export class SpeechToTextService {
  static async transcribeAudioWithFallback(audioBlob: Blob, options: TranscriptionOptions = {}): Promise<SpeechToTextResult> {
    console.log("Starting audio transcription with enhanced fallback system...");
    
    // Convert blob to base64 once for all providers
    const base64Audio = await AudioUtils.convertBlobToBase64(audioBlob);
    
    // Try Supadata first (primary)
    const supadataResult = await SupadataProvider.transcribe(audioBlob, base64Audio, options);
    if (supadataResult.success && supadataResult.text?.trim()) {
      console.log("✅ Supadata speech-to-text successful");
      return supadataResult;
    }
    
    console.warn("⚠️ Supadata failed, trying OpenAI Whisper Edge Function...");
    
    // Fallback to OpenAI Whisper via Edge Function
    const whisperResult = await WhisperEdgeProvider.transcribe(audioBlob, base64Audio);
    if (whisperResult.success && whisperResult.text?.trim()) {
      console.log("✅ OpenAI Whisper Edge Function successful");
      return whisperResult;
    }
    
    console.warn("⚠️ Edge Function failed, trying Direct OpenAI API...");
    
    // Final fallback - Direct OpenAI API call
    const directResult = await OpenAIDirectProvider.transcribe(audioBlob);
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

  // Enhanced retry mechanism with exponential backoff
  static async transcribeWithRetry(audioBlob: Blob, maxRetries: number = 2, options: TranscriptionOptions = {}): Promise<SpeechToTextResult> {
    let lastResult: SpeechToTextResult = { success: false, error: 'Unknown error' };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Speech-to-text attempt ${attempt}/${maxRetries}`);
      
      const result = await this.transcribeAudioWithFallback(audioBlob, options);
      
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
