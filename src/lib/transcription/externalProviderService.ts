
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionResult } from "./types";

export class ExternalProviderService {
  // Enhanced provider configuration with optimized settings
  private static readonly PROVIDERS = [
    {
      name: 'podsqueeze',
      priority: 1,
      timeout: 45000, // 45 seconds
      capabilities: ['youtube', 'podcast', 'audio'],
      description: 'Premium AI transcription with speaker detection',
      accuracyScore: 95
    },
    {
      name: 'whisper',
      priority: 2,
      timeout: 60000, // 60 seconds
      capabilities: ['audio', 'video', 'youtube'],
      description: 'OpenAI Whisper - High accuracy speech recognition',
      accuracyScore: 92
    },
    {
      name: 'riverside',
      priority: 3,
      timeout: 50000, // 50 seconds
      capabilities: ['video', 'podcast', 'youtube'],
      description: 'Professional video/audio transcription',
      accuracyScore: 88
    }
  ];

  static async callTranscriptionAPI(
    provider: string,
    url: string,
    options: any = {}
  ): Promise<TranscriptionResult> {
    const providerConfig = this.PROVIDERS.find(p => p.name === provider);
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    console.log(`🚀 Starting ${provider} transcription with optimized settings...`);
    const startTime = Date.now();

    try {
      // Enhanced options for better accuracy
      const enhancedOptions = {
        include_metadata: true,
        include_timestamps: true,
        language: 'auto',
        format: 'detailed',
        quality: 'high',
        speaker_detection: true,
        noise_reduction: true,
        ...options
      };

      const { data, error } = await Promise.race([
        supabase.functions.invoke('multimedia-transcription', {
          body: {
            provider,
            url,
            options: enhancedOptions
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${provider} timeout after ${providerConfig.timeout}ms`)), providerConfig.timeout)
        )
      ]);

      if (error) {
        throw new Error(`${provider} API error: ${error.message}`);
      }

      if (!data?.transcription && !data?.text) {
        throw new Error(`${provider} returned empty transcription`);
      }

      const processingTime = Date.now() - startTime;
      const transcriptionText = data.transcription || data.text;

      // Enhanced quality validation
      if (transcriptionText.length < 20) {
        throw new Error(`${provider} returned suspiciously short transcript (${transcriptionText.length} chars)`);
      }

      // Quality score based on length and processing time - fix arithmetic operations
      const lengthScore = Math.min(50, transcriptionText.length / 100);
      const timeBonus = Math.max(0, 30 - (processingTime / 1000));
      const qualityScore = Math.min(100, Math.max(50, 
        lengthScore + providerConfig.accuracyScore + timeBonus
      ));

      console.log(`✅ ${provider} completed: ${transcriptionText.length} chars in ${processingTime}ms (quality: ${qualityScore.toFixed(1)}%)`);

      return {
        success: true,
        text: transcriptionText,
        metadata: {
          ...data.metadata,
          provider,
          processingTime,
          qualityScore: qualityScore.toFixed(1),
          extractionMethod: `${provider}-enhanced`,
          transcriptionLength: transcriptionText.length,
          providerPriority: providerConfig.priority,
          capabilities: providerConfig.capabilities
        },
        provider
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ ${provider} failed after ${processingTime}ms:`, error);
      
      return {
        success: false,
        error: `${provider}: ${error.message}`,
        metadata: {
          provider,
          processingTime,
          extractionMethod: `${provider}-failed`,
          errorType: error.name || 'TranscriptionError'
        },
        provider
      };
    }
  }

  static getProviderStatus() {
    return this.PROVIDERS.map(provider => ({
      name: provider.name.charAt(0).toUpperCase() + provider.name.slice(1),
      priority: provider.priority,
      capabilities: provider.capabilities,
      description: provider.description,
      timeout: provider.timeout,
      accuracyScore: provider.accuracyScore
    }));
  }

  // Enhanced parallel processing for multiple providers
  static async callMultipleProviders(url: string, options: any = {}) {
    const enabledProviders = this.PROVIDERS.slice(0, 2); // Use top 2 for speed
    
    console.log(`🔄 Running parallel transcription with ${enabledProviders.length} providers...`);
    
    const results = await Promise.allSettled(
      enabledProviders.map(provider => 
        this.callTranscriptionAPI(provider.name, url, options)
      )
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<TranscriptionResult> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value)
      .sort((a, b) => {
        const aScore = typeof a.metadata?.qualityScore === 'string' 
          ? parseFloat(a.metadata.qualityScore) 
          : (a.metadata?.qualityScore || 0);
        const bScore = typeof b.metadata?.qualityScore === 'string' 
          ? parseFloat(b.metadata.qualityScore) 
          : (b.metadata?.qualityScore || 0);
        return bScore - aScore;
      });

    if (successfulResults.length > 0) {
      const bestResult = successfulResults[0];
      bestResult.metadata = {
        ...bestResult.metadata,
        providersAttempted: enabledProviders.map(p => p.name).join(', '),
        alternativeResults: successfulResults.length - 1
      };
      return bestResult;
    }

    throw new Error('All providers failed');
  }
}
