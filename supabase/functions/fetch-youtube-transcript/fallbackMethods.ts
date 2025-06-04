import { corsHeaders } from "./utils.ts";
import { TranscriptOptions, TranscriptSegment, TranscriptResponse } from "./transcriptExtractor.ts";

export class FallbackMethods {
  
  async tryAllMethods(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    const methods = [
      () => this.methodYouTubeAPI(videoId, options),
      () => this.methodYouTubeWatch(videoId, options),
      () => this.methodYouTubeCaption(videoId, options),
      () => this.methodYouTubeEmbed(videoId, options)
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

  private async methodYouTubeAPI(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting YouTube Data API v3...");
      
      const apiKey = Deno.env.get('YOUTUBE_API_KEY');
      if (!apiKey) {
        console.log("YouTube API key not found, skipping API method");
        return null;
      }

      // Get video details first
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
      );

      if (!videoResponse.ok) {
        throw new Error(`YouTube API error: ${videoResponse.status}`);
      }

      const videoData = await videoResponse.json();
      
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error("Video not found");
      }

      // Try to get captions
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${apiKey}&part=snippet`
      );

      if (captionsResponse.ok) {
        const captionsData = await captionsResponse.json();
        
        if (captionsData.items && captionsData.items.length > 0) {
          // Find English captions or first available
          const caption = captionsData.items.find((item: any) => 
            item.snippet.language === 'en' || item.snippet.language === options.language
          ) || captionsData.items[0];

          console.log("Found captions via YouTube API");
          
          const transcriptResponse: TranscriptResponse = {
            success: true,
            transcript: "Captions found but content extraction requires additional permissions. You can add your own notes about this video.",
            segments: [],
            metadata: {
              videoId,
              title: videoData.items[0].snippet.title,
              author: videoData.items[0].snippet.channelTitle,
              language: caption.snippet.language || 'en',
              duration: 0,
              segmentCount: 0,
              extractionMethod: 'youtube-api-captions-found'
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

      return null;
    } catch (error) {
      console.error("YouTube API method failed:", error);
      return null;
    }
  }

  private async methodYouTubeWatch(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting YouTube watch page scraping...");
      
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Enhanced regex patterns for finding caption data
      const patterns = [
        /"captionTracks":\[([^\]]+)\]/,
        /"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[([^\]]+)\]/,
        /\"captionTracks\":\[([^\]]*)\]/
      ];
      
      let captionTracks = null;
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            captionTracks = JSON.parse(`[${match[1]}]`);
            break;
          } catch (e) {
            continue;
          }
        }
      }
      
      if (captionTracks && captionTracks.length > 0) {
        // Find English captions or first available
        const englishTrack = captionTracks.find((track: any) => 
          track.languageCode === 'en' || track.languageCode === options.language
        ) || captionTracks[0];
        
        if (englishTrack && englishTrack.baseUrl) {
          const captionResponse = await fetch(englishTrack.baseUrl);
          const captionXml = await captionResponse.text();
          
          const segments = this.parseXMLCaptions(captionXml);
          
          if (segments.length > 0) {
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
      
      const captionUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`
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

  private parseXMLCaptions(xmlContent: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    try {
      const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g;
      let match;
      
      while ((match = textRegex.exec(xmlContent)) !== null) {
        const start = parseFloat(match[1] || '0');
        const duration = parseFloat(match[2] || '3');
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
    let transcript = segments.map(segment => segment.text).join(' ');
    
    transcript = transcript
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s+/g, '$1 ')
      .replace(/,\s+/g, ', ')
      .trim();
    
    return transcript;
  }
}
