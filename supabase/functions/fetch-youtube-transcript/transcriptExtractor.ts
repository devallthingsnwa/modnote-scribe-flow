
import { corsHeaders } from "./utils.ts";
import { ITranscriptStrategy, TranscriptOptions } from "./strategies/ITranscriptStrategy.ts";
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
    // Initialize extraction strategies in order of preference
    this.strategies = [
      new YouTubeApiStrategy(),
      new VideoPageStrategy(),
      new CaptionTracksStrategy(),
      new AlternativeApiStrategy(),
      new EmbedExtractionStrategy(),
      new WhisperStrategy() // AI fallback when captions aren't available
    ];
  }

  async extractTranscript(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    console.log(`Starting transcript extraction for video: ${videoId}`);

    // Try each extraction strategy in order
    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      
      try {
        console.log(`Attempting extraction method ${i + 1}: ${strategy.getName()}`);
        const result = await strategy.extract(videoId, options);
        
        if (result) {
          console.log(`Successfully extracted transcript using ${strategy.getName()}`);
          return result;
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
        transcript: "Unable to extract transcript from this video. The video may be private, restricted, or have audio processing limitations.",
        error: "All extraction methods failed including AI transcription",
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
