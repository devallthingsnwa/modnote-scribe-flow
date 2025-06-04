
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult } from "./types";

export class ExternalProviderService {
  static async callTranscriptionAPI(
    provider: string,
    url: string,
    options?: any
  ): Promise<TranscriptionResult> {
    try {
      const { data, error } = await supabase.functions.invoke('multimedia-transcription', {
        body: { 
          provider,
          url,
          options: {
            include_metadata: true,
            include_timestamps: true,
            ...options
          }
        }
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        text: data.transcription,
        metadata: data.metadata,
        provider
      };
    } catch (error) {
      console.error(`${provider} transcription failed:`, error);
      return {
        success: false,
        error: error.message || `${provider} transcription failed`,
        provider
      };
    }
  }

  static async tryExternalProviders(url: string): Promise<TranscriptionResult> {
    const providers = ['podsqueeze', 'whisper', 'riverside'];
    
    for (const provider of providers) {
      console.log(`Attempting transcription with ${provider}...`);
      
      const result = await this.callTranscriptionAPI(provider, url);
      
      if (result.success) {
        console.log(`Transcription successful with ${provider}`);
        return result;
      }
      
      console.warn(`${provider} failed, trying next provider...`);
    }

    return {
      success: false,
      error: 'All external transcription providers failed. Please try again later or use a different video.'
    };
  }
}
