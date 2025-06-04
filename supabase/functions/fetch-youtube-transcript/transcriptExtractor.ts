
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
        
        // Add delay between attempts
        if (attempt < maxAttempts) {
          const delay = attempt * 2000;
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Enhanced parsing error on attempt ${attempt}:`, error);
        
        if (attempt === maxAttempts) {
          return this.createEnhancedFallbackResponse(videoId, error.message);
        }
      }
    }
    
    return this.createEnhancedFallbackResponse(videoId, "All extraction attempts failed");
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
        return supadataResult;
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
        return fallbackResult;
      }
    } catch (error) {
      console.warn("Fallback methods extraction failed:", error);
    }
    
    // Strategy 3: Final fallback with structured response
    console.log("Creating structured fallback response...");
    return this.createStructuredFallbackResponse(videoId, options);
  }
  
  private createStructuredFallbackResponse(videoId: string, options: TranscriptOptions): Response {
    console.log("Creating structured fallback response for video:", videoId);
    
    const fallbackTranscript = `Video Title: YouTube Video ${videoId}

This video's transcript could not be automatically extracted. This may be because:
- The video doesn't have captions available
- The video is private or restricted
- Captions are disabled by the creator
- The video is a live stream

You can:
1. Visit the video directly to check for captions
2. Add your own notes about this video below
3. Try again later as captions may become available

---

## My Notes

Add your personal notes and observations about this video here:

### Key Points
- 

### Timestamps & Moments
- 00:00 - 
- 

### Summary
`;

    const transcriptResponse: TranscriptResponse = {
      success: true,
      transcript: fallbackTranscript,
      metadata: {
        videoId,
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        language: options.language || 'en',
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'structured-fallback',
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
  
  private createEnhancedFallbackResponse(videoId: string, error: string): Response {
    console.log("Creating enhanced fallback response due to error:", error);
    
    const transcriptResponse: TranscriptResponse = {
      success: true,
      transcript: `# YouTube Video Analysis\n\n**Video ID:** ${videoId}\n**Source:** https://www.youtube.com/watch?v=${videoId}\n**Status:** Transcript extraction failed\n**Error:** ${error}\n**Timestamp:** ${new Date().toLocaleString()}\n\n---\n\nAutomatic transcript extraction was not successful. You can manually add your notes and observations about this video below.\n\n## My Notes\n\nAdd your content here...`,
      metadata: {
        videoId,
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        language: 'en',
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'error-fallback',
        provider: 'fallback-system',
        quality: 'basic'
      },
      error: error
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
