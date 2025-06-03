import { corsHeaders } from "./utils.ts";
import { TranscriptOptions, TranscriptSegment, TranscriptResponse } from "./transcriptExtractor.ts";

export class FallbackMethods {
  
  async tryAllMethods(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    console.log("Starting enhanced fallback methods for transcript extraction");
    
    const methods = [
      () => this.methodYouTubeAPI(videoId, options),
      () => this.methodYouTubeWatch(videoId, options),
      () => this.methodYouTubeCaption(videoId, options),
      () => this.methodDirectCaptionAPI(videoId, options)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Trying enhanced fallback method ${i + 1}/${methods.length}`);
        const result = await methods[i]();
        
        if (result) {
          console.log(`Enhanced fallback method ${i + 1} successful`);
          return result;
        }
      } catch (error) {
        console.log(`Enhanced fallback method ${i + 1} failed:`, error.message);
      }
    }

    console.log("All enhanced fallback methods failed");
    return null;
  }

  private async methodYouTubeAPI(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting YouTube Data API v3 with enhanced error handling...");
      
      const apiKey = Deno.env.get('YOUTUBE_API_KEY');
      if (!apiKey) {
        console.log("YouTube API key not found, skipping API method");
        return null;
      }

      // Get video details with retry logic
      let videoResponse;
      for (let retry = 0; retry < 3; retry++) {
        try {
          videoResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails&maxResults=1`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'YouTube-Transcript-Service/1.0'
              }
            }
          );
          break;
        } catch (error) {
          if (retry === 2) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
        }
      }

      if (!videoResponse.ok) {
        throw new Error(`YouTube API error: ${videoResponse.status}`);
      }

      const videoData = await videoResponse.json();
      
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error("Video not found or not accessible");
      }

      const videoInfo = videoData.items[0];
      console.log(`Video found: "${videoInfo.snippet.title}" by ${videoInfo.snippet.channelTitle}`);

      // Try to get captions with enhanced error handling
      try {
        const captionsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${apiKey}&part=snippet&maxResults=50`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'YouTube-Transcript-Service/1.0'
            }
          }
        );

        if (captionsResponse.ok) {
          const captionsData = await captionsResponse.json();
          
          if (captionsData.items && captionsData.items.length > 0) {
            // Find best caption track
            const caption = this.findBestCaptionTrack(captionsData.items, options.language);

            if (caption) {
              console.log(`Found captions in ${caption.snippet.language}: ${caption.snippet.name}`);
              
              // Create enhanced fallback response with video metadata
              const transcriptResponse: TranscriptResponse = {
                success: true,
                transcript: this.createSmartFallbackContent(videoInfo, caption, videoId),
                segments: [],
                metadata: {
                  videoId,
                  title: videoInfo.snippet.title,
                  author: videoInfo.snippet.channelTitle,
                  language: caption.snippet.language || 'en',
                  duration: this.parseDuration(videoInfo.contentDetails?.duration),
                  segmentCount: 0,
                  extractionMethod: 'youtube-api-metadata-enhanced',
                  provider: 'youtube-api',
                  quality: 'metadata'
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
      } catch (captionError) {
        console.warn("Caption API call failed:", captionError);
      }

      // Even without captions, return useful metadata
      const transcriptResponse: TranscriptResponse = {
        success: true,
        transcript: this.createMetadataOnlyContent(videoInfo, videoId),
        segments: [],
        metadata: {
          videoId,
          title: videoInfo.snippet.title,
          author: videoInfo.snippet.channelTitle,
          language: options.language || 'en',
          duration: this.parseDuration(videoInfo.contentDetails?.duration),
          segmentCount: 0,
          extractionMethod: 'youtube-api-metadata-only',
          provider: 'youtube-api',
          quality: 'basic'
        }
      };

      return new Response(
        JSON.stringify(transcriptResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      console.error("YouTube API method failed:", error);
      return null;
    }
  }

  private findBestCaptionTrack(captions: any[], preferredLanguage?: string): any {
    // Priority order: preferred language > English > auto-generated > any
    const preferred = captions.find(c => c.snippet.language === preferredLanguage);
    if (preferred) return preferred;

    const english = captions.find(c => c.snippet.language === 'en');
    if (english) return english;

    const autoGenerated = captions.find(c => c.snippet.trackKind === 'asr');
    if (autoGenerated) return autoGenerated;

    return captions[0]; // Return first available
  }

  private createSmartFallbackContent(videoInfo: any, caption: any, videoId: string): string {
    return `# 🎥 ${videoInfo.snippet.title}

**Channel:** ${videoInfo.snippet.channelTitle}
**Published:** ${new Date(videoInfo.snippet.publishedAt).toLocaleDateString()}
**Video ID:** ${videoId}
**Captions Available:** ✅ Yes (${caption.snippet.language})

---

## 📋 Video Information

${videoInfo.snippet.description ? videoInfo.snippet.description.substring(0, 500) + '...' : 'No description available'}

## 💡 Transcript Status

This video has captions available in **${caption.snippet.language}** but automatic extraction was not possible. The captions are ${caption.snippet.trackKind === 'asr' ? 'auto-generated' : 'manually created'}.

### How to Access Captions:
1. **Visit YouTube directly**: https://www.youtube.com/watch?v=${videoId}
2. **Enable captions**: Click the CC button in the video player
3. **Manual notes**: Use the sections below to add your own observations

---

## 📝 My Notes

### Key Points
- [ ] Main topic: 
- [ ] Important insights: 
- [ ] Action items: 

### Timestamps & Observations
*Add your own timestamp notes while watching*

**00:00** - 
**05:00** - 
**10:00** - 

---

*This structured note was created because automatic transcript extraction was unavailable, but captions exist on YouTube.*`;
  }

  private createMetadataOnlyContent(videoInfo: any, videoId: string): string {
    return `# 🎥 ${videoInfo.snippet.title}

**Channel:** ${videoInfo.snippet.channelTitle}
**Published:** ${new Date(videoInfo.snippet.publishedAt).toLocaleDateString()}
**Video ID:** ${videoId}
**Captions Available:** ❓ Unknown

---

## 📋 Video Information

${videoInfo.snippet.description ? videoInfo.snippet.description.substring(0, 500) + '...' : 'No description available'}

## 💡 Next Steps

1. **Check for captions**: Visit https://www.youtube.com/watch?v=${videoId}
2. **Manual notes**: Use the space below for your observations
3. **Try later**: Captions may become available over time

---

## 📝 My Notes

### Key Points
- [ ] Main topic: 
- [ ] Important insights: 
- [ ] Questions raised: 

### Personal Observations
*Your thoughts and takeaways from watching this video*

---

*This note was created with available video metadata when transcript extraction was not possible.*`;
  }

  private parseDuration(duration: string): number {
    if (!duration) return 0;
    
    // Parse ISO 8601 duration (PT4M13S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
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
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      console.log(`Fetched YouTube page: ${html.length} characters`);
      
      // Enhanced patterns for finding caption data
      const patterns = [
        /"captionTracks":\[([^\]]+)\]/,
        /"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[([^\]]+)\]/,
        /\"captionTracks\":\[([^\]]*)\]/,
        /"playerCaptionsTracklistRenderer":{"captionTracks":\[([^\]]+)\]/
      ];
      
      let captionTracks = null;
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            captionTracks = JSON.parse(`[${match[1]}]`);
            console.log(`Found caption tracks using pattern: ${captionTracks.length} tracks`);
            break;
          } catch (e) {
            console.warn("Failed to parse caption tracks, trying next pattern");
            continue;
          }
        }
      }
      
      if (captionTracks && captionTracks.length > 0) {
        console.log(`Processing ${captionTracks.length} caption tracks`);
        
        // Find best caption track
        const englishTrack = captionTracks.find((track: any) => 
          track.languageCode === 'en' || track.languageCode === options.language
        ) || captionTracks[0];
        
        if (englishTrack && englishTrack.baseUrl) {
          console.log(`Fetching captions from: ${englishTrack.languageCode}`);
          
          const captionResponse = await fetch(englishTrack.baseUrl);
          const captionXml = await captionResponse.text();
          
          const segments = this.parseXMLCaptions(captionXml);
          
          if (segments.length > 0) {
            const naturalTranscript = this.formatAsNaturalText(segments);
            
            console.log(`Successfully extracted ${segments.length} segments, ${naturalTranscript.length} characters`);
            
            const transcriptResponse: TranscriptResponse = {
              success: true,
              transcript: naturalTranscript,
              segments,
              metadata: {
                videoId,
                language: englishTrack.languageCode || 'en',
                duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                segmentCount: segments.length,
                extractionMethod: 'youtube-watch-scraping-enhanced',
                provider: 'youtube-scraping',
                quality: segments.length > 100 ? 'high' : segments.length > 50 ? 'medium' : 'basic'
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

      console.log("No caption tracks found in page content");
      return null;
    } catch (error) {
      console.error("Enhanced YouTube watch method failed:", error);
      return null;
    }
  }

  private async methodYouTubeCaption(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting enhanced direct caption API...");
      
      const captionUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3&tlang=${options.language || 'en'}`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3&lang=en`,
      ];

      for (const url of captionUrls) {
        try {
          console.log(`Trying caption URL: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/xml, text/xml, */*',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });

          if (response.ok) {
            const content = await response.text();
            console.log(`Caption response: ${content.length} characters`);
            
            if (content.includes('<text') || content.includes('"events"')) {
              let segments;
              
              if (content.includes('"events"')) {
                // JSON format
                try {
                  const jsonData = JSON.parse(content);
                  segments = this.parseJSONCaptions(jsonData);
                } catch (e) {
                  console.warn("Failed to parse JSON captions");
                  continue;
                }
              } else {
                // XML format
                segments = this.parseXMLCaptions(content);
              }
              
              if (segments.length > 0) {
                const naturalTranscript = this.formatAsNaturalText(segments);
                
                console.log(`Successfully extracted ${segments.length} segments from direct API`);
                
                const transcriptResponse: TranscriptResponse = {
                  success: true,
                  transcript: naturalTranscript,
                  segments,
                  metadata: {
                    videoId,
                    language: options.language || 'en',
                    duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                    segmentCount: segments.length,
                    extractionMethod: 'direct-caption-api-enhanced',
                    provider: 'youtube-caption-api',
                    quality: segments.length > 100 ? 'high' : segments.length > 50 ? 'medium' : 'basic'
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

      console.log("All direct caption API attempts failed");
      return null;
    } catch (error) {
      console.error("Enhanced caption API method failed:", error);
      return null;
    }
  }

  private async methodDirectCaptionAPI(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("Attempting direct YouTube caption extraction...");
      
      // Try getting caption track list first
      const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
      
      const trackResponse = await fetch(trackListUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (trackResponse.ok) {
        const trackListXml = await trackResponse.text();
        console.log("Got caption track list");
        
        // Parse available languages
        const langMatches = trackListXml.matchAll(/lang_code="([^"]+)"/g);
        const availableLanguages = Array.from(langMatches).map(match => match[1]);
        
        console.log(`Available caption languages: ${availableLanguages.join(', ')}`);
        
        // Try preferred language first, then fallback to available ones
        const languagesToTry = [
          options.language || 'en',
          'en',
          'en-US',
          ...availableLanguages
        ].filter((lang, index, arr) => arr.indexOf(lang) === index);
        
        for (const lang of languagesToTry) {
          try {
            const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
            const captionResponse = await fetch(captionUrl);
            
            if (captionResponse.ok) {
              const captionXml = await captionResponse.text();
              
              if (captionXml.includes('<text')) {
                const segments = this.parseXMLCaptions(captionXml);
                
                if (segments.length > 0) {
                  const naturalTranscript = this.formatAsNaturalText(segments);
                  
                  console.log(`Direct caption extraction successful for ${lang}: ${segments.length} segments`);
                  
                  const transcriptResponse: TranscriptResponse = {
                    success: true,
                    transcript: naturalTranscript,
                    segments,
                    metadata: {
                      videoId,
                      language: lang,
                      duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                      segmentCount: segments.length,
                      extractionMethod: 'direct-caption-extraction',
                      provider: 'youtube-direct',
                      quality: segments.length > 100 ? 'high' : segments.length > 50 ? 'medium' : 'basic'
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
            console.log(`Failed to get captions for ${lang}:`, error.message);
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Direct caption API method failed:", error);
      return null;
    }
  }

  private parseJSONCaptions(jsonData: any): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    try {
      if (jsonData.events && Array.isArray(jsonData.events)) {
        for (const event of jsonData.events) {
          if (event.segs && Array.isArray(event.segs)) {
            let text = '';
            for (const seg of event.segs) {
              if (seg.utf8) {
                text += seg.utf8;
              }
            }
            
            if (text.trim()) {
              segments.push({
                start: parseFloat(event.tStartMs || 0) / 1000,
                duration: parseFloat(event.dDurationMs || 3000) / 1000,
                text: text.trim()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error parsing JSON captions:", error);
    }
    
    return segments;
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
