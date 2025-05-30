
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult } from "./types";

export class ExternalProviderService {
  // Provider priority: Podsqueeze (default) → Whisper (OSS) → Riverside.fm (fallback)
  private static readonly PROVIDER_PRIORITY = ['podsqueeze', 'whisper', 'riverside'] as const;

  static async callTranscriptionAPI(
    provider: string,
    url: string,
    options?: any
  ): Promise<TranscriptionResult> {
    try {
      console.log(`📡 Calling ${provider} transcription API...`);
      
      const { data, error } = await supabase.functions.invoke('multimedia-transcription', {
        body: { 
          provider,
          url,
          options: {
            include_metadata: true,
            include_timestamps: true,
            language: 'auto',
            ...options
          }
        }
      });

      if (error) {
        console.error(`${provider} API error:`, error);
        throw error;
      }

      // Validate response has actual content
      if (!data?.transcription || data.transcription.length < 50) {
        throw new Error(`${provider} returned empty or very short transcription`);
      }

      console.log(`✅ ${provider} transcription successful: ${data.transcription.length} characters`);

      return {
        success: true,
        text: data.transcription,
        metadata: {
          ...data.metadata,
          provider,
          extractionMethod: provider,
          processingTime: data.metadata?.processingTime
        },
        provider
      };
    } catch (error) {
      console.error(`❌ ${provider} transcription failed:`, error);
      return {
        success: false,
        error: error.message || `${provider} transcription failed`,
        provider
      };
    }
  }

  static async tryExternalProviders(url: string, options?: any): Promise<TranscriptionResult> {
    console.log('🔄 Starting external provider fallback sequence...');
    
    for (const provider of this.PROVIDER_PRIORITY) {
      console.log(`🎯 Attempting transcription with ${provider}...`);
      
      try {
        const result = await this.callTranscriptionAPI(provider, url, options);
        
        if (result.success && result.text && result.text.length > 50) {
          console.log(`✅ Successfully transcribed with ${provider}`);
          return result;
        }
        
        console.warn(`⚠️ ${provider} failed or returned insufficient content, trying next provider...`);
        
      } catch (error) {
        console.error(`❌ ${provider} provider error:`, error);
        continue;
      }
    }

    console.error('❌ All external transcription providers failed');
    
    return {
      success: false,
      error: `All transcription providers failed (${this.PROVIDER_PRIORITY.join(', ')}). Please try again later or check if the content is accessible.`,
      metadata: {
        providersAttempted: this.PROVIDER_PRIORITY.join(', '),
        extractionMethod: 'all-providers-failed'
      }
    };
  }

  // Get provider configuration for UI display
  static getProviderStatus(): Array<{
    name: string;
    priority: number;
    description: string;
    capabilities: string[];
  }> {
    return [
      {
        name: 'Podsqueeze',
        priority: 1,
        description: 'Primary provider optimized for podcasts and YouTube',
        capabilities: ['YouTube', 'Podcasts', 'Audio Files', 'Metadata Extraction']
      },
      {
        name: 'Whisper (OpenAI)',
        priority: 2,
        description: 'High-quality OSS transcription for audio files',
        capabilities: ['Audio Files', 'Multi-language', 'High Accuracy']
      },
      {
        name: 'Riverside.fm',
        priority: 3,
        description: 'Fallback provider with speaker identification',
        capabilities: ['Video', 'Audio', 'Speaker Labels', 'Timestamps']
      }
    ];
  }
}
