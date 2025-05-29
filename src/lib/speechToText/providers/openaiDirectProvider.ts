
import { SpeechToTextResult } from "../types";

export class OpenAIDirectProvider {
  static async transcribe(audioBlob: Blob): Promise<SpeechToTextResult> {
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
}
