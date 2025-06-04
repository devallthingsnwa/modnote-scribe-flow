
import { corsHeaders } from "./utils.ts";
import { TranscriptOptions, TranscriptSegment, TranscriptResponse } from "./transcriptExtractor.ts";

export class FallbackMethods {
  
  async tryAllMethods(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    const methods = [
      () => this.methodYouTubeWatch(videoId, options),
      () => this.methodYouTubeCaption(videoId, options),
      () => this.methodYouTubeEmbed(videoId, options),
      () => this.methodAlternativeAPI(videoId, options)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Trying fallback method ${i + 1}/${methods.length}`);
        const result = await methods[i]();
        
        if (result) {
          console.log(`Fallback method ${i + 1} successful`);
          return result;
        }
      } catch (error) {
        console.log(`Fallback method ${i + 1} failed:`, error.message);
      }
    }

    return null;
  }

  private async methodYouTubeWatch(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting YouTube watch page scraping...");
      
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Look for caption tracks in the page
      const captionRegex = /"captionTracks":\[([^\]]+)\]/;
      const match = html.match(captionRegex);
      
      if (match) {
        const captionTracks = JSON.parse(`[${match[1]}]`);
        
        // Find English captions or first available
        const englishTrack = captionTracks.find((track: any) => 
          track.languageCode === 'en' || track.languageCode === options.language
        ) || captionTracks[0];
        
        if (englishTrack && englishTrack.baseUrl) {
          const captionResponse = await fetch(englishTrack.baseUrl);
          const captionXml = await captionResponse.text();
          
          const segments = this.parseXMLCaptions(captionXml);
          
          if (segments.length > 0) {
            // Format as natural flowing text like your example
            const naturalTranscript = this.formatAsNaturalText(segments);
            
            const transcriptResponse: TranscriptResponse = {
              success: true,
              transcript: naturalTranscript,
              segments,
              metadata: {
                videoId,
                language: englishTrack.languageCode || 'en',
                duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                segmentCount: segments.length,
                extractionMethod: 'youtube-watch-scraping'
              }
            };

            return new Response(
              JSON.stringify(transcriptResponse),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      }

      return null;
    } catch (error) {
      console.error("YouTube watch method failed:", error);
      return null;
    }
  }

  private async methodYouTubeCaption(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting direct caption API...");
      
      // Try direct caption API endpoints
      const captionUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`
      ];

      for (const url of captionUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (response.ok) {
            const xmlContent = await response.text();
            
            if (xmlContent.includes('<text')) {
              const segments = this.parseXMLCaptions(xmlContent);
              
              if (segments.length > 0) {
                const naturalTranscript = this.formatAsNaturalText(segments);
                
                const transcriptResponse: TranscriptResponse = {
                  success: true,
                  transcript: naturalTranscript,
                  segments,
                  metadata: {
                    videoId,
                    language: options.language || 'en',
                    duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                    segmentCount: segments.length,
                    extractionMethod: 'direct-caption-api'
                  }
                };

                return new Response(
                  JSON.stringify(transcriptResponse),
                  {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                  }
                );
              }
            }
          }
        } catch (error) {
          console.log(`Caption URL failed: ${url}`, error.message);
        }
      }

      return null;
    } catch (error) {
      console.error("Caption API method failed:", error);
      return null;
    }
  }

  private async methodYouTubeEmbed(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting YouTube embed scraping...");
      
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const html = await response.text();
        // Look for any caption data in embed page
        console.log("Embed page loaded, but no caption extraction implemented yet");
      }

      return null;
    } catch (error) {
      console.error("Embed method failed:", error);
      return null;
    }
  }

  private async methodAlternativeAPI(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting alternative transcript services...");
      
      // This could call external transcript services if available
      console.log("No alternative APIs configured");
      
      return null;
    } catch (error) {
      console.error("Alternative API method failed:", error);
      return null;
    }
  }

  private parseXMLCaptions(xmlContent: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    try {
      // Parse XML caption format
      const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g;
      let match;
      
      while ((match = textRegex.exec(xmlContent)) !== null) {
        const start = parseFloat(match[1] || '0');
        const duration = parseFloat(match[2] || '3'); // Default 3 seconds if no duration
        const text = this.decodeXMLEntities(match[3] || '').trim();
        
        if (text && text.length > 0) {
          segments.push({
            start,
            duration,
            text
          });
        }
      }
    } catch (error) {
      console.error("Error parsing XML captions:", error);
    }
    
    return segments;
  }

  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private formatAsNaturalText(segments: TranscriptSegment[]): string {
    // Format transcript as natural flowing text like the example
    let transcript = segments.map(segment => segment.text).join(' ');
    
    // Clean up and format the text naturally
    transcript = transcript
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/([.!?])\s+/g, '$1 ') // Proper sentence spacing
      .replace(/,\s+/g, ', ') // Proper comma spacing
      .trim();
    
    return transcript;
  }

  private formatTranscriptText(segments: TranscriptSegment[]): string {
    return segments.map(segment => {
      const timestamp = this.formatTimestamp(segment.start);
      return `[${timestamp}] ${segment.text}`;
    }).join('\n');
  }

  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
