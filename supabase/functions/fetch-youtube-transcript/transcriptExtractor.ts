
import { SupadataStrategy } from "./strategies/SupadataStrategy.ts";
import { FallbackMethods } from "./fallbackMethods.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptOptions {
  includeTimestamps?: boolean;
  language?: string;
  format?: 'text' | 'json' | 'srt';
  extendedTimeout?: boolean;
  retryCount?: number;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript: string;
  segments?: TranscriptSegment[];
  metadata?: {
    videoId: string;
    title?: string;
    author?: string;
    language?: string;
    duration?: number;
    segmentCount?: number;
    extractionMethod: string;
    provider?: string;
    quality?: string;
  };
  error?: string;
}

export class TranscriptExtractor {
  
  async extractTranscriptWithExtendedHandling(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    const timeout = options.extendedTimeout ? 120000 : 60000;
    const maxAttempts = 3;
    
    console.log(`Enhanced extraction for ${videoId} with extended timeout (${timeout}ms)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Enhanced attempt ${attempt}/${maxAttempts} for video ${videoId}`);
        
        const result = await this.extractWithTimeout(videoId, options, timeout);
        if (result) {
          return result;
        }
        
        if (attempt < maxAttempts) {
          const delay = attempt * 2000;
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Enhanced parsing error on attempt ${attempt}:`, error);
        
        if (attempt === maxAttempts) {
          return this.createGracefulFallbackResponse(videoId, error.message);
        }
      }
    }
    
    return this.createGracefulFallbackResponse(videoId, "All extraction attempts failed");
  }
  
  private async extractWithTimeout(videoId: string, options: TranscriptOptions, timeout: number): Promise<Response | null> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`Extraction timeout after ${timeout}ms`);
        resolve(null);
      }, timeout);
      
      try {
        const result = await this.tryAllExtractionMethods(videoId, options);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Extraction error:", error);
        resolve(null);
      }
    });
  }
  
  private async tryAllExtractionMethods(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    console.log("Trying all extraction methods in sequence...");
    
    // Strategy 1: Supadata API (if available)
    try {
      console.log("Attempting Supadata API extraction...");
      const supadataStrategy = new SupadataStrategy();
      const supadataResult = await supadataStrategy.extract(videoId, options);
      
      if (supadataResult) {
        console.log("Supadata API extraction successful");
        return this.processTranscriptResponse(supadataResult, videoId);
      }
    } catch (error) {
      console.warn("Supadata API extraction failed:", error);
    }
    
    // Strategy 2: Enhanced fallback methods
    try {
      console.log("Attempting enhanced fallback methods...");
      const fallbackMethods = new FallbackMethods();
      const fallbackResult = await fallbackMethods.tryAllMethods(videoId, options);
      
      if (fallbackResult) {
        console.log("Fallback methods extraction successful");
        return this.processTranscriptResponse(fallbackResult, videoId);
      }
    } catch (error) {
      console.warn("Fallback methods extraction failed:", error);
    }
    
    // Strategy 3: Final graceful fallback
    console.log("Creating graceful fallback response...");
    return this.createGracefulFallbackResponse(videoId, "No transcript available");
  }

  private async processTranscriptResponse(response: Response, videoId: string): Promise<Response> {
    try {
      const data = await response.json();
      
      if (data.success && data.transcript && data.transcript.length > 50) {
        // Get video metadata for better formatting
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        let videoTitle = `YouTube Video ${videoId}`;
        let videoAuthor = 'Unknown';
        
        try {
          const oembedResponse = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
          );
          if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json();
            videoTitle = oembedData.title || videoTitle;
            videoAuthor = oembedData.author_name || videoAuthor;
          }
        } catch (error) {
          console.warn("Failed to fetch video metadata:", error);
        }

        // Return enhanced transcript response
        const transcriptResponse: TranscriptResponse = {
          success: true,
          transcript: data.transcript,
          segments: data.segments,
          metadata: {
            ...data.metadata,
            videoId,
            title: videoTitle,
            author: videoAuthor,
            extractionMethod: data.metadata?.extractionMethod || 'api-extraction'
          }
        };

        return new Response(
          JSON.stringify(transcriptResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return response;
    } catch (error) {
      console.error("Error processing transcript response:", error);
      return this.createGracefulFallbackResponse(videoId, error.message);
    }
  }
  
  private createGracefulFallbackResponse(videoId: string, error: string): Response {
    console.log("Creating graceful fallback response for video:", videoId);
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Create a helpful fallback message that doesn't look like an error
    const fallbackTranscript = `This video's transcript is not currently available for automatic extraction. 

Common reasons:
• Video doesn't have captions enabled
• Captions are in a format that requires special permissions
• Video is private, unlisted, or has restricted access
• Live stream or very recent upload

You can still create notes about this video! Consider:
• Watching the video and taking manual notes
• Checking if captions are available directly on YouTube
• Adding timestamps and key points as you watch
• Summarizing the main topics and insights`;

    const transcriptResponse: TranscriptResponse = {
      success: true,
      transcript: fallbackTranscript,
      metadata: {
        videoId,
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        language: 'en',
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'graceful-fallback',
        provider: 'fallback-system',
        quality: 'template'
      }
    };

    return new Response(
      JSON.stringify(transcriptResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
