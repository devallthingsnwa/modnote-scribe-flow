
import { corsHeaders } from "./utils.ts";
import { TranscriptOptions, TranscriptSegment, TranscriptResponse } from "./transcriptExtractor.ts";

export class FallbackMethods {
  
  async tryAllMethods(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    const methods = [
      () => this.methodYouTubeCaption(videoId, options),
      () => this.methodYouTubeWatch(videoId, options),
      () => this.methodYouTubeEmbed(videoId, options),
      () => this.methodYouTubeAPI(videoId, options)
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

  private async methodYouTubeCaption(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting direct caption API with enhanced parsing...");
      
      const captionUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3&tlang=${options.language || 'en'}`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`
      ];

      for (const url of captionUrls) {
        try {
          console.log(`Trying caption URL: ${url}`);
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache'
            }
          });

          if (response.ok) {
            const content = await response.text();
            console.log(`Caption content received: ${content.length} characters`);
            
            let segments: TranscriptSegment[] = [];
            
            // Try parsing as XML first
            if (content.includes('<text') || content.includes('<?xml')) {
              segments = this.parseXMLCaptions(content);
            }
            // Try parsing as JSON
            else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
              try {
                const jsonData = JSON.parse(content);
                segments = this.parseJSONCaptions(jsonData);
              } catch (e) {
                console.log('Failed to parse as JSON, trying XML fallback');
                segments = this.parseXMLCaptions(content);
              }
            }
            
            if (segments.length > 0) {
              console.log(`Successfully parsed ${segments.length} caption segments`);
              const rawTranscript = this.formatAsRawTranscript(segments);
              
              if (rawTranscript.length > 50) {
                const transcriptResponse: TranscriptResponse = {
                  success: true,
                  transcript: rawTranscript,
                  segments,
                  metadata: {
                    videoId,
                    language: options.language || 'en',
                    duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                    segmentCount: segments.length,
                    extractionMethod: 'enhanced-caption-api'
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
      console.error("Enhanced caption API method failed:", error);
      return null;
    }
  }

  private async methodYouTubeWatch(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting enhanced YouTube watch page scraping...");
      
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      console.log(`Received HTML page: ${html.length} characters`);
      
      // Enhanced patterns for finding caption data
      const patterns = [
        /"captionTracks":\[([^\]]+)\]/,
        /"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[([^\]]+)\]/,
        /\"captionTracks\":\[([^\]]*)\]/,
        /"captionTracks":\s*\[([^\]]+)\]/g,
        /captionTracks.*?\[([^\]]+)\]/g
      ];
      
      let captionTracks = null;
      
      for (const pattern of patterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          try {
            const trackData = `[${match[1]}]`;
            captionTracks = JSON.parse(trackData);
            console.log(`Found caption tracks: ${captionTracks.length} tracks`);
            break;
          } catch (e) {
            continue;
          }
        }
        if (captionTracks) break;
      }
      
      if (captionTracks && captionTracks.length > 0) {
        // Find the best track (English or user's language, auto-generated)
        const preferredTrack = this.selectBestCaptionTrack(captionTracks, options.language);
        
        if (preferredTrack && preferredTrack.baseUrl) {
          console.log(`Selected caption track: ${preferredTrack.languageCode} (${preferredTrack.kind || 'manual'})`);
          
          const captionResponse = await fetch(preferredTrack.baseUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (captionResponse.ok) {
            const captionContent = await captionResponse.text();
            const segments = this.parseXMLCaptions(captionContent);
            
            if (segments.length > 0) {
              const rawTranscript = this.formatAsRawTranscript(segments);
              
              if (rawTranscript.length > 50) {
                const transcriptResponse: TranscriptResponse = {
                  success: true,
                  transcript: rawTranscript,
                  segments,
                  metadata: {
                    videoId,
                    language: preferredTrack.languageCode || 'en',
                    duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                    segmentCount: segments.length,
                    extractionMethod: 'enhanced-watch-scraping'
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
        }
      }

      return null;
    } catch (error) {
      console.error("Enhanced YouTube watch method failed:", error);
      return null;
    }
  }

  private async methodYouTubeEmbed(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting enhanced YouTube embed scraping...");
      
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.youtube.com/'
        }
      });

      if (response.ok) {
        const html = await response.text();
        console.log("Embed page loaded, extracting caption URLs...");
        
        // Enhanced caption URL patterns
        const captionPatterns = [
          /\/api\/timedtext[^"'\s]*/g,
          /timedtext[^"'\s]*v=${videoId}[^"'\s]*/g,
          /baseUrl[^"']*api\/timedtext[^"'\s]*/g
        ];
        
        const captionUrls: string[] = [];
        
        for (const pattern of captionPatterns) {
          const matches = html.match(pattern);
          if (matches) {
            captionUrls.push(...matches);
          }
        }
        
        // Remove duplicates
        const uniqueUrls = [...new Set(captionUrls)];
        console.log(`Found ${uniqueUrls.length} potential caption URLs in embed`);
        
        for (const relativeUrl of uniqueUrls) {
          try {
            const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://www.youtube.com${relativeUrl}`;
            console.log(`Trying embed caption URL: ${fullUrl}`);
            
            const captionResponse = await fetch(fullUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (captionResponse.ok) {
              const xmlContent = await captionResponse.text();
              const segments = this.parseXMLCaptions(xmlContent);
              
              if (segments.length > 0) {
                const rawTranscript = this.formatAsRawTranscript(segments);
                
                if (rawTranscript.length > 50) {
                  const transcriptResponse: TranscriptResponse = {
                    success: true,
                    transcript: rawTranscript,
                    segments,
                    metadata: {
                      videoId,
                      language: options.language || 'en',
                      duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                      segmentCount: segments.length,
                      extractionMethod: 'enhanced-embed-extraction'
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
            console.log(`Embed caption URL failed: ${relativeUrl}`, error.message);
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Enhanced embed method failed:", error);
      return null;
    }
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

      // Try to get captions list
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${apiKey}&part=snippet`
      );

      if (captionsResponse.ok) {
        const captionsData = await captionsResponse.json();
        
        if (captionsData.items && captionsData.items.length > 0) {
          console.log("Found captions via YouTube API, but content download requires OAuth authentication");
          
          // Return a message indicating captions are available but not accessible
          const fallbackMessage = `This video has captions available on YouTube but requires additional authentication to access. You can view them directly on the video or add your own notes about the content.`;
          
          const transcriptResponse: TranscriptResponse = {
            success: true,
            transcript: fallbackMessage,
            segments: [],
            metadata: {
              videoId,
              title: videoData.items[0].snippet.title,
              author: videoData.items[0].snippet.channelTitle,
              language: captionsData.items[0].snippet.language || 'en',
              duration: 0,
              segmentCount: 0,
              extractionMethod: 'youtube-api-detected-captions'
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

  private selectBestCaptionTrack(tracks: any[], preferredLanguage?: string): any {
    // Priority order: manual captions in preferred language > auto captions in preferred language > manual English > auto English > any manual > any auto
    const language = preferredLanguage || 'en';
    
    // First try manual captions in preferred language
    let bestTrack = tracks.find(track => 
      track.languageCode === language && 
      (!track.kind || track.kind === 'manual' || track.kind === '')
    );
    
    if (bestTrack) return bestTrack;
    
    // Try auto captions in preferred language
    bestTrack = tracks.find(track => 
      track.languageCode === language && 
      track.kind === 'asr'
    );
    
    if (bestTrack) return bestTrack;
    
    // Try manual English captions
    bestTrack = tracks.find(track => 
      track.languageCode === 'en' && 
      (!track.kind || track.kind === 'manual' || track.kind === '')
    );
    
    if (bestTrack) return bestTrack;
    
    // Try auto English captions
    bestTrack = tracks.find(track => 
      track.languageCode === 'en' && 
      track.kind === 'asr'
    );
    
    if (bestTrack) return bestTrack;
    
    // Any manual captions
    bestTrack = tracks.find(track => 
      !track.kind || track.kind === 'manual' || track.kind === ''
    );
    
    if (bestTrack) return bestTrack;
    
    // Any captions at all
    return tracks[0] || null;
  }

  private parseXMLCaptions(xmlContent: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    try {
      console.log(`Parsing XML captions: ${xmlContent.length} characters`);
      
      // Enhanced XML parsing with multiple patterns
      const textPatterns = [
        /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g,
        /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g,
        /<text[^>]*start="([^"]*)"[^>]*>([^<]*)<\/text>/g
      ];
      
      for (const pattern of textPatterns) {
        let match;
        while ((match = pattern.exec(xmlContent)) !== null) {
          const start = parseFloat(match[1] || '0');
          const duration = match[3] ? parseFloat(match[2] || '3') : 3;
          const text = match[3] || match[2] || '';
          
          if (text && text.trim().length > 0) {
            const cleanText = this.decodeAndCleanText(text);
            if (cleanText.length > 0) {
              segments.push({
                start,
                duration,
                text: cleanText
              });
            }
          }
        }
        
        if (segments.length > 0) {
          console.log(`Successfully parsed ${segments.length} segments with pattern`);
          break;
        }
      }
      
      // Sort segments by start time
      segments.sort((a, b) => a.start - b.start);
      
    } catch (error) {
      console.error("Error parsing XML captions:", error);
    }
    
    return segments;
  }

  private parseJSONCaptions(jsonData: any): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    try {
      console.log("Parsing JSON captions...");
      
      // Handle different JSON structures
      let events = jsonData.events || jsonData.body?.events || jsonData;
      
      if (!Array.isArray(events)) {
        events = [events];
      }
      
      for (const event of events) {
        if (event.segs) {
          for (const seg of event.segs) {
            if (seg.utf8) {
              segments.push({
                start: event.tStartMs / 1000,
                duration: event.dDurationMs / 1000,
                text: this.decodeAndCleanText(seg.utf8)
              });
            }
          }
        }
      }
      
      console.log(`Parsed ${segments.length} JSON caption segments`);
    } catch (error) {
      console.error("Error parsing JSON captions:", error);
    }
    
    return segments;
  }

  private decodeAndCleanText(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatAsRawTranscript(segments: TranscriptSegment[]): string {
    if (segments.length === 0) {
      return "";
    }
    
    // Join all text segments with spaces, preserving natural flow
    let transcript = segments.map(segment => segment.text).join(' ');
    
    // Clean up spacing and formatting
    transcript = transcript
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s+/g, '$1 ')
      .replace(/,\s+/g, ', ')
      .trim();
    
    console.log(`Formatted raw transcript: ${transcript.length} characters`);
    return transcript;
  }
}
