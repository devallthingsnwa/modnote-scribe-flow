
import { YouTubeAPI } from "./youtubeApi.ts";
import { FallbackMethods } from "./fallbackMethods.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptOptions {
  includeTimestamps?: boolean;
  language?: string;
  format?: 'text' | 'json' | 'srt';
  maxRetries?: number;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
  speaker?: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  metadata?: {
    videoId: string;
    language: string;
    duration: number;
    segmentCount: number;
    extractionMethod: string;
  };
  error?: string;
}

export class TranscriptExtractor {
  private youtubeApi: YouTubeAPI;
  private fallbackMethods: FallbackMethods;

  constructor() {
    this.youtubeApi = new YouTubeAPI();
    this.fallbackMethods = new FallbackMethods();
  }

  async extractTranscript(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    const defaultOptions: TranscriptOptions = {
      includeTimestamps: true,
      language: 'en',
      format: 'json',
      maxRetries: 3,
      ...options
    };

    console.log(`Starting transcript extraction for ${videoId} with options:`, defaultOptions);

    // Method 1: Try YouTube Transcript API first
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    
    if (apiKey) {
      console.log("Attempting YouTube Transcript API...");
      try {
        const apiResult = await this.youtubeApi.fetchWithAPI(videoId, apiKey, defaultOptions);
        if (apiResult && await this.isValidResponse(apiResult)) {
          console.log("YouTube Transcript API successful");
          return apiResult;
        }
      } catch (error) {
        console.log("YouTube Transcript API failed:", error.message);
      }
    } else {
      console.log("No YouTube Transcript API key found, skipping API method");
    }
    
    // Method 2: Enhanced fallback methods with retry logic
    console.log("Trying enhanced fallback transcript extraction methods...");
    
    for (let attempt = 1; attempt <= defaultOptions.maxRetries!; attempt++) {
      try {
        console.log(`Fallback attempt ${attempt}/${defaultOptions.maxRetries}`);
        const fallbackResult = await this.fallbackMethods.tryAllMethods(videoId, defaultOptions);
        
        if (fallbackResult && await this.isValidResponse(fallbackResult)) {
          console.log(`Fallback method successful on attempt ${attempt}`);
          return fallbackResult;
        }
      } catch (error) {
        console.log(`Fallback attempt ${attempt} failed:`, error.message);
        
        if (attempt === defaultOptions.maxRetries) {
          console.log("All fallback attempts exhausted");
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Method 3: Final fallback - return structured error
    console.log("All transcript extraction methods failed");
    
    const errorResponse: TranscriptResponse = {
      success: false,
      error: "Transcript not available for this video. The video may not have captions available, may be private, or may have restricted access.",
      metadata: {
        videoId,
        language: defaultOptions.language!,
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'none'
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  private async isValidResponse(response: Response): Promise<boolean> {
    try {
      const clone = response.clone();
      const data = await clone.json();
      
      // Check if response has valid transcript data
      return data && (
        (data.transcript && data.transcript.length > 50) ||
        (data.segments && Array.isArray(data.segments) && data.segments.length > 0)
      );
    } catch {
      return false;
    }
  }

  private formatTranscriptResponse(
    segments: TranscriptSegment[], 
    videoId: string, 
    method: string,
    format: string = 'json'
  ): TranscriptResponse {
    const response: TranscriptResponse = {
      success: true,
      segments,
      metadata: {
        videoId,
        language: 'en',
        duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
        segmentCount: segments.length,
        extractionMethod: method
      }
    };

    // Format transcript text based on requested format
    if (format === 'text' || format === 'srt') {
      response.transcript = this.formatAsText(segments, format === 'srt');
    }

    return response;
  }

  private formatAsText(segments: TranscriptSegment[], includeSRT: boolean = false): string {
    if (includeSRT) {
      return segments.map((segment, index) => {
        const startTime = this.formatSRTTime(segment.start);
        const endTime = this.formatSRTTime(segment.start + segment.duration);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      }).join('\n');
    }
    
    return segments.map(segment => {
      const timestamp = this.formatTimestamp(segment.start);
      const speaker = segment.speaker ? `${segment.speaker}: ` : '';
      return `[${timestamp}] ${speaker}${segment.text}`;
    }).join('\n');
  }

  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }
}
