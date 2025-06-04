
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult, TranscriptionConfig } from "./types";

export class ExternalProviderService {
  static async callTranscriptionAPI(
    provider: string, 
    url: string, 
    config: any = {}
  ): Promise<TranscriptionResult> {
    try {
      console.log(`🔄 Calling ${provider} transcription API for: ${url}`);
      
      const enhancedConfig = {
        ...config,
        instructions: "Extract and transcribe all the words spoken in this YouTube video into a clean, readable transcript. Ignore background noise and non-speech sounds. Return only the spoken text.",
        quality: 'high',
        focus_on_speech: true,
        remove_filler_words: false,
        include_punctuation: true
      };

      const { data, error } = await supabase.functions.invoke('multimedia-transcription', {
        body: { 
          provider,
          url,
          options: enhancedConfig
        }
      });

      if (error) {
        throw new Error(error.message || `${provider} transcription failed`);
      }

      if (data?.success && data?.transcript) {
        console.log(`✅ ${provider} transcription successful: ${data.transcript.length} characters`);
        
        return {
          success: true,
          text: data.transcript,
          metadata: {
            ...data.metadata,
            provider,
            instructions_used: enhancedConfig.instructions
          },
          provider
        };
      } else {
        throw new Error(data?.error || `${provider} returned no transcript data`);
      }
    } catch (error) {
      console.error(`❌ ${provider} transcription failed:`, error);
      return {
        success: false,
        error: error.message || `${provider} transcription failed`,
        provider
      };
    }
  }
}
