
import { corsHeaders } from "./utils.ts";
import { ITranscriptStrategy, TranscriptOptions } from "./strategies/ITranscriptStrategy.ts";
import { SupadataStrategy } from "./strategies/SupadataStrategy.ts";
import { YouTubeApiStrategy } from "./strategies/YouTubeApiStrategy.ts";
import { VideoPageStrategy } from "./strategies/VideoPageStrategy.ts";
import { CaptionTracksStrategy } from "./strategies/CaptionTracksStrategy.ts";
import { AlternativeApiStrategy } from "./strategies/AlternativeApiStrategy.ts";
import { EmbedExtractionStrategy } from "./strategies/EmbedExtractionStrategy.ts";
import { WhisperStrategy } from "./strategies/WhisperStrategy.ts";

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  error?: string;
  metadata?: {
    videoId: string;
    language?: string;
    duration?: number;
    segmentCount?: number;
    extractionMethod: string;
  };
}

export class TranscriptExtractor {
  private strategies: ITranscriptStrategy[];

  constructor() {
    // Initialize extraction strategies in order of reliability and preference
    this.strategies = [
      new SupadataStrategy(),           // NEW: Most reliable - dedicated transcript API
      new CaptionTracksStrategy(),      // Second most reliable - direct caption API
      new VideoPageStrategy(),          // Third most reliable - page scraping
      new YouTubeApiStrategy(),         // Fourth - requires API key
      new EmbedExtractionStrategy(),    // Fifth - embed page extraction
      new AlternativeApiStrategy(),     // Sixth - third-party APIs
      new WhisperStrategy()             // Last resort - AI transcription (currently disabled)
    ];
  }

  async extractTranscript(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    console.log(`Starting transcript extraction for video: ${videoId}`);

    // Try each extraction strategy in order
    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      
      try {
        console.log(`Attempting extraction method ${i + 1}/${this.strategies.length}: ${strategy.getName()}`);
        const result = await strategy.extract(videoId, options);
        
        if (result) {
          console.log(`Successfully extracted transcript using ${strategy.getName()}`);
          return result;
        } else {
          console.log(`Strategy ${strategy.getName()} returned null - trying next method`);
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.getName()} failed:`, error.message);
        continue;
      }
    }

    // If all strategies fail, return a structured error response
    console.error("All transcript extraction strategies failed");
    return new Response(
      JSON.stringify({
        success: false,
        transcript: "Unable to extract transcript from this video. The video may not have captions available, may be private, or captions may be disabled by the creator.",
        error: "All extraction methods failed - no captions found",
        metadata: {
          videoId,
          segments: 0,
          duration: 0,
          extractionMethod: 'failed'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}
