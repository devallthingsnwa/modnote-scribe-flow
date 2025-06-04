
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
    const timeout = options.extendedTimeout ? 120000 : 60000; // 2 minutes for extended, 1 minute normal
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
          const delay = attempt * 2000; // 2s, 4s delays
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Enhanced parsing error on attempt ${attempt}:`, error);
        
        if (attempt === maxAttempts) {
          // Final attempt - return comprehensive fallback
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
    
    // Strategy 3: Basic scraping attempt
    try {
      console.log("Attempting basic YouTube page scraping...");
      const scrapingResult = await this.tryBasicScraping(videoId, options);
      
      if (scrapingResult) {
        console.log("Basic scraping successful");
        return scrapingResult;
      }
    } catch (error) {
      console.warn("Basic scraping failed:", error);
    }
    
    console.log("All extraction methods failed");
    return null;
  }
  
  private async tryBasicScraping(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      console.log(`Fetched HTML content: ${html.length} characters`);
      
      // Try to extract video title and basic info
      const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"[^>]*>/);
      const authorMatch = html.match(/<meta property="og:site_name" content="([^"]*)"[^>]*>/);
      
      const title = titleMatch ? titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : `YouTube Video ${videoId}`;
      const author = authorMatch ? authorMatch[1] : 'YouTube';
      
      // Basic response with video info (no transcript available)
      const transcriptResponse: TranscriptResponse = {
        success: true,
        transcript: `Video Title: ${title}\n\nTranscript not available through automatic extraction. This video may not have captions enabled, may be restricted, or may be a live stream.\n\nYou can:\n1. Check if captions are available by visiting the video directly\n2. Add your own notes about this video\n3. Try again later as captions may become available`,
        metadata: {
          videoId,
          title,
          author,
          language: options.language || 'en',
          duration: 0,
          segmentCount: 0,
          extractionMethod: 'basic-scraping-info-only',
          provider: 'youtube-scraping',
          quality: 'basic'
        }
      };

      return new Response(
        JSON.stringify(transcriptResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
      
    } catch (error) {
      console.error("Basic scraping failed:", error);
      return null;
    }
  }
  
  private createEnhancedFallbackResponse(videoId: string, error: string): Response {
    console.log("Creating enhanced fallback response");
    
    const transcriptResponse: TranscriptResponse = {
      success: true, // Mark as success so the client can still save the note
      transcript: `# YouTube Video Analysis\n\n**Video ID:** ${videoId}\n**Source:** https://www.youtube.com/watch?v=${videoId}\n**Status:** Transcript extraction unavailable\n**Timestamp:** ${new Date().toLocaleString()}\n\n---\n\n## Analysis Status\n\nAutomatic transcript extraction was not possible for this video. Common reasons:\n\n- **No Captions Available**: Video doesn't have auto-generated or manual captions\n- **Restricted Access**: Video may be private, unlisted, or region-restricted\n- **Live Content**: Live streams may not have stable caption data\n- **Service Limitations**: Temporary API or service restrictions\n\n## Recommended Actions\n\n### Immediate Steps\n1. **Visit Video Directly**: Check https://www.youtube.com/watch?v=${videoId} for available captions\n2. **Manual Notes**: Use the space below to add your own observations\n3. **Check Later**: Captions may become available over time\n\n### Alternative Methods\n- Enable captions directly on YouTube (CC button)\n- Use browser extensions for transcript extraction\n- Contact the video creator about caption availability\n\n---\n\n## My Notes\n\n### Key Points\n- [ ] Main topic: \n- [ ] Important insights: \n- [ ] Action items: \n\n### Timestamps & Moments\n*Add specific timestamps and observations*\n\n**00:00** - \n**05:00** - \n**10:00** - \n\n### Personal Reflections\n*Your thoughts and how this relates to your interests*\n\n---\n\n*Note: This structured template was created automatically when transcript extraction was unavailable. Edit this content to add your personal insights and observations.*`,
      metadata: {
        videoId,
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        language: 'en',
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'enhanced-fallback-template',
        provider: 'fallback-system',
        quality: 'template'
      },
      error: `Extraction failed: ${error}`
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
