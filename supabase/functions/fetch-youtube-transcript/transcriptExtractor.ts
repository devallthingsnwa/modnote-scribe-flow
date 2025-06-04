
import { SupadataStrategy } from "./strategies/SupadataStrategy.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptOptions {
  includeTimestamps?: boolean;
  language?: string;
  format?: 'text' | 'json' | 'srt';
  multipleStrategies?: boolean;
  extendedTimeout?: boolean;
  chunkProcessing?: boolean;
  retryCount?: number;
}

export class TranscriptExtractor {
  private static strategies = [
    new SupadataStrategy()
  ];

  static async extractTranscript(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    console.log(`TranscriptExtractor: Starting extraction for video ${videoId} with options:`, options);
    
    // Try each strategy in order
    for (const strategy of this.strategies) {
      try {
        console.log(`Trying strategy: ${strategy.getName()}`);
        const result = await strategy.extract(videoId, options);
        
        if (result && result.ok) {
          console.log(`Strategy ${strategy.getName()} succeeded`);
          return result;
        } else {
          console.log(`Strategy ${strategy.getName()} failed or returned null`);
        }
      } catch (error) {
        console.error(`Strategy ${strategy.getName()} threw error:`, error);
        continue;
      }
    }

    console.log("All transcript extraction strategies failed");
    return null;
  }
}
