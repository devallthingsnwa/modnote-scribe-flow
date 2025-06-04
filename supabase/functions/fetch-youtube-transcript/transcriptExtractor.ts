
import { YouTubeTranscriptStrategy } from "./strategies/YouTubeTranscriptStrategy.ts";
import { SupadataStrategy } from "./strategies/SupadataStrategy.ts";
import { YouTubeApiStrategy } from "./strategies/YouTubeApiStrategy.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptResponse {
  success: boolean;
  transcript: string;
  metadata?: any;
  error?: string;
}

export class TranscriptExtractor {
  private strategies = [
    new YouTubeTranscriptStrategy(),
    new SupadataStrategy(),
    new YouTubeApiStrategy()
  ];

  async extractTranscript(videoId: string, options: any = {}): Promise<Response> {
    console.log(`🎯 Enhanced transcript extraction for video: ${videoId}`);
    const startTime = Date.now();
    let lastError = null;
    
    // Enhanced options for better extraction
    const enhancedOptions = {
      language: 'auto',
      includeTimestamps: true,
      format: 'detailed',
      qualityLevel: 'high',
      ...options
    };

    // Try multiple strategies in parallel for faster results
    if (enhancedOptions.multipleStrategies) {
      return await this.parallelExtraction(videoId, enhancedOptions);
    }

    // Sequential extraction with optimized order
    for (const strategy of this.strategies) {
      try {
        console.log(`🔄 Trying ${strategy.getName()} strategy...`);
        const strategyStartTime = Date.now();
        
        const result = await Promise.race([
          strategy.extract(videoId, enhancedOptions),
          // 20 second timeout per strategy for faster overall experience
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error(`${strategy.getName()} timeout`)), 20000)
          )
        ]);

        if (result) {
          const strategyTime = Date.now() - strategyStartTime;
          console.log(`✅ ${strategy.getName()} succeeded in ${strategyTime}ms`);
          return result;
        }
        
        console.log(`⚠️ ${strategy.getName()} returned null, trying next...`);
      } catch (error) {
        const strategyTime = Date.now() - strategyStartTime;
        console.error(`❌ ${strategy.getName()} failed after ${strategyTime}ms:`, error);
        lastError = error;
        continue;
      }
    }

    // Enhanced fallback response
    const totalTime = Date.now() - startTime;
    console.warn(`❌ All extraction strategies failed after ${totalTime}ms`);
    
    return new Response(
      JSON.stringify({
        success: false,
        transcript: "Unable to extract transcript from this video. The video may be private, have no captions, or use unsupported caption formats.",
        error: lastError?.message || "All extraction methods failed",
        metadata: {
          videoId,
          extractionMethod: 'all-failed',
          totalAttempts: this.strategies.length,
          processingTime: totalTime,
          strategiesAttempted: this.strategies.map(s => s.getName()).join(', '),
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // New parallel extraction method for maximum speed
  private async parallelExtraction(videoId: string, options: any): Promise<Response> {
    console.log(`🚀 Running parallel extraction with ${this.strategies.length} strategies...`);
    const startTime = Date.now();

    try {
      const results = await Promise.allSettled(
        this.strategies.map(async (strategy) => {
          try {
            const result = await Promise.race([
              strategy.extract(videoId, options),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error(`${strategy.getName()} timeout`)), 15000)
              )
            ]);
            return { strategy: strategy.getName(), result };
          } catch (error) {
            throw { strategy: strategy.getName(), error };
          }
        })
      );

      // Find the first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.result) {
          const totalTime = Date.now() - startTime;
          console.log(`✅ Parallel extraction succeeded with ${result.value.strategy} in ${totalTime}ms`);
          return result.value.result;
        }
      }

      // If no strategy succeeded, return enhanced error
      const totalTime = Date.now() - startTime;
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.strategy || 'unknown')
        .join(', ');

      return new Response(
        JSON.stringify({
          success: false,
          transcript: "Unable to extract transcript using parallel processing. The video may have restricted access or no available captions.",
          error: "All parallel strategies failed",
          metadata: {
            videoId,
            extractionMethod: 'parallel-failed',
            strategiesAttempted: this.strategies.map(s => s.getName()).join(', '),
            processingTime: totalTime,
            parallelProcessing: true,
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Parallel extraction error after ${totalTime}ms:`, error);
      
      return new Response(
        JSON.stringify({
          success: false,
          transcript: "Technical error during parallel transcript extraction.",
          error: error.message,
          metadata: {
            videoId,
            extractionMethod: 'parallel-error',
            processingTime: totalTime,
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  }
}
