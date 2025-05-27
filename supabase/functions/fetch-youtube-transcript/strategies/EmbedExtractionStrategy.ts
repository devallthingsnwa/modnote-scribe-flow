
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class EmbedExtractionStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'embed-extraction';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting embed extraction");
      
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`Embed page request failed: ${response.status}`);
      }

      const html = await response.text();
      
      // Look for caption data in the embed page
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionMatch) {
        try {
          const captionTracks = JSON.parse(captionMatch[1]);
          
          if (captionTracks && captionTracks.length > 0) {
            // Find English track or first available
            const track = captionTracks.find((t: any) => 
              t.languageCode === 'en' || t.languageCode === options.language
            ) || captionTracks[0];
            
            if (track && track.baseUrl) {
              const captionResponse = await fetch(track.baseUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              if (captionResponse.ok) {
                const captionContent = await captionResponse.text();
                
                if (captionContent && captionContent.includes('<text')) {
                  const segments = this.parseXMLCaptions(captionContent);
                  
                  if (segments.length > 0) {
                    const formattedTranscript = segments
                      .map(segment => {
                        const startTime = this.formatTime(segment.start);
                        const endTime = this.formatTime(segment.start + segment.duration);
                        return `[${startTime} - ${endTime}] ${segment.text}`;
                      })
                      .join('\n');

                    console.log(`Embed extraction successful: ${segments.length} segments`);

                    return new Response(
                      JSON.stringify({
                        success: true,
                        transcript: formattedTranscript,
                        metadata: {
                          videoId,
                          segments: segments.length,
                          extractionMethod: 'embed-extraction'
                        }
                      }),
                      {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                      }
                    );
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Failed to parse caption tracks from embed:", e);
        }
      }

      return null;
    } catch (error) {
      console.error("Embed extraction failed:", error);
      return null;
    }
  }

  private parseXMLCaptions(xmlContent: string): Array<{start: number, duration: number, text: string}> {
    const segments: Array<{start: number, duration: number, text: string}> = [];
    
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

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
