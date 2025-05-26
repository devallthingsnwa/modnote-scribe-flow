
import { ContentParser } from "./contentParser.ts";
import { corsHeaders } from "./utils.ts";

export class FallbackMethods {
  private contentParser: ContentParser;

  constructor() {
    this.contentParser = new ContentParser();
  }

  async tryAllMethods(videoId: string): Promise<Response> {
    // Method 1: Try direct YouTube transcript extraction
    try {
      console.log("Trying direct YouTube transcript extraction...");
      const result = await this.extractFromYouTubeDirectly(videoId);
      if (result) return result;
    } catch (error) {
      console.log("Direct extraction failed:", error.message);
    }

    // Method 2: Try alternative transcript services
    try {
      console.log("Trying alternative transcript services...");
      const result = await this.tryAlternativeServices(videoId);
      if (result) return result;
    } catch (error) {
      console.log("Alternative services failed:", error.message);
    }

    // Method 3: Enhanced web scraping
    console.log("Falling back to enhanced web scraping...");
    return await this.enhancedWebScraping(videoId);
  }

  private async extractFromYouTubeDirectly(videoId: string): Promise<Response | null> {
    // Try to use YouTube's internal API endpoints
    const endpoints = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&asr_langs=en&caps=asr&exp=xfm&fmt=vtt`,
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/vtt,text/plain,*/*',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });

        if (response.ok) {
          const content = await response.text();
          if (content && content.length > 100 && !content.includes('error')) {
            console.log(`Success with endpoint: ${endpoint}`);
            return await this.contentParser.processTranscriptContent(content, 'youtube-direct');
          }
        }
      } catch (error) {
        console.log(`Endpoint ${endpoint} failed:`, error.message);
      }
    }

    return null;
  }

  private async tryAlternativeServices(videoId: string): Promise<Response | null> {
    // Try youtube-transcript npm package approach via different endpoints
    const alternativeEndpoints = [
      `https://youtubetranscript.com/api/transcript?video_id=${videoId}`,
      `https://transcript.rephrase.ai/api/youtube?video_id=${videoId}`,
    ];

    for (const endpoint of alternativeEndpoints) {
      try {
        console.log(`Trying alternative service: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TranscriptBot/1.0)',
            'Accept': 'application/json,text/plain'
          },
          signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (data.transcript || data.text || data.captions)) {
            console.log(`Success with alternative service: ${endpoint}`);
            const transcript = data.transcript || data.text || data.captions;
            return await this.contentParser.processTranscriptContent(transcript, 'alternative-service');
          }
        }
      } catch (error) {
        console.log(`Alternative service ${endpoint} failed:`, error.message);
      }
    }

    return null;
  }

  private async enhancedWebScraping(videoId: string): Promise<Response> {
    console.log("Using enhanced web scraping for video:", videoId);
    
    const attempts = [
      {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      {
        url: `https://m.youtube.com/watch?v=${videoId}`,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    ];

    for (const attempt of attempts) {
      try {
        console.log(`Scraping: ${attempt.url}`);
        
        const response = await fetch(attempt.url, {
          headers: {
            'User-Agent': attempt.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) continue;
        
        const html = await response.text();
        console.log(`Fetched HTML, length: ${html.length}`);
        
        // Enhanced caption URL extraction
        const captionUrls = this.extractCaptionUrls(html);
        console.log(`Found ${captionUrls.length} caption URLs`);
        
        for (const url of captionUrls) {
          try {
            const result = await this.fetchFromCaptionUrl(url);
            if (result) return result;
          } catch (e) {
            console.log(`Caption URL failed: ${e.message}`);
          }
        }
        
      } catch (error) {
        console.log(`Scraping attempt failed: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        transcript: "No transcript available for this video. The video may not have captions enabled or may be restricted.",
        error: "All extraction methods failed"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  private extractCaptionUrls(html: string): string[] {
    const urls = new Set<string>();
    
    // Multiple patterns to find caption URLs
    const patterns = [
      /"baseUrl":"([^"]*api\/timedtext[^"]*)"/g,
      /'baseUrl':'([^']*api\/timedtext[^']*)'/g,
      /baseUrl["']?\s*:\s*["']([^"']*api\/timedtext[^"']*)/g,
      /"url":"([^"]*api\/timedtext[^"]*)"/g,
      /captionTracks.*?"baseUrl":"([^"]*)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let url = match[1];
        if (url) {
          url = url.replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\/g, '');
          if (url.includes('timedtext')) {
            urls.add(url);
          }
        }
      }
    }
    
    return Array.from(urls);
  }

  private async fetchFromCaptionUrl(baseUrl: string): Promise<Response | null> {
    try {
      let captionUrl = baseUrl;
      
      if (!captionUrl.startsWith('http')) {
        captionUrl = `https://www.youtube.com${captionUrl}`;
      }
      
      // Ensure we request VTT format
      const url = new URL(captionUrl);
      url.searchParams.set('fmt', 'vtt');
      url.searchParams.set('tlang', 'en');
      
      console.log(`Fetching captions from: ${url.toString().substring(0, 100)}...`);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/vtt,text/plain,*/*'
        }
      });
      
      if (!response.ok) return null;
      
      const content = await response.text();
      if (!content || content.length < 50) return null;
      
      return await this.contentParser.processTranscriptContent(content, 'web-scraping');
      
    } catch (error) {
      console.error("Caption URL fetch failed:", error);
      return null;
    }
  }
}
