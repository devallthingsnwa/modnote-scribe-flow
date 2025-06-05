
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class CaptionTracksStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'caption-tracks-direct';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting direct caption tracks extraction");
      
      // Try multiple direct caption API endpoints
      const captionUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=vtt`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`
      ];

      for (const url of captionUrls) {
        try {
          console.log(`Trying caption URL: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/xml,application/xml,text/plain,*/*',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });

          if (response.ok) {
            const content = await response.text();
            
            if (content && content.length > 100 && (content.includes('<text') || content.includes('WEBVTT'))) {
              console.log(`Direct caption extraction successful from: ${url}`);
              
              const segments = this.parseCaption(content);
              
              if (segments.length > 0) {
                const formattedTranscript = segments
                  .map(segment => {
                    const startTime = this.formatTime(segment.start);
                    const endTime = this.formatTime(segment.start + segment.duration);
                    return `[${startTime} - ${endTime}] ${segment.text}`;
                  })
                  .join('\n');

                return new Response(
                  JSON.stringify({
                    success: true,
                    transcript: formattedTranscript,
                    metadata: {
                      videoId,
                      segments: segments.length,
                      duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
                      extractionMethod: 'caption-tracks-direct'
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
        } catch (error) {
          console.log(`Caption URL failed: ${url}`, error.message);
        }
      }

      return null;
    } catch (error) {
      console.error("Caption tracks extraction failed:", error);
      return null;
    }
  }

  private parseCaption(content: string): Array<{start: number, duration: number, text: string}> {
    const segments: Array<{start: number, duration: number, text: string}> = [];
    
    if (content.includes('WEBVTT')) {
      return this.parseWebVTT(content);
    } else if (content.includes('<text')) {
      return this.parseXML(content);
    }
    
    return segments;
  }

  private parseWebVTT(content: string): Array<{start: number, duration: number, text: string}> {
    const segments: Array<{start: number, duration: number, text: string}> = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for timestamp lines (00:01.234 --> 00:05.678)
      const timeMatch = line.match(/(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        const start = this.parseTimeString(timeMatch[1]);
        const end = this.parseTimeString(timeMatch[2]);
        
        // Get the text on the next non-empty line
        let textLine = '';
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.includes('-->')) {
            textLine = nextLine;
            break;
          }
        }
        
        if (textLine) {
          segments.push({
            start,
            duration: end - start,
            text: this.cleanText(textLine)
          });
        }
      }
    }
    
    return segments;
  }

  private parseXML(content: string): Array<{start: number, duration: number, text: string}> {
    const segments: Array<{start: number, duration: number, text: string}> = [];
    
    const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g;
    let match;
    
    while ((match = textRegex.exec(content)) !== null) {
      const start = parseFloat(match[1] || '0');
      const duration = parseFloat(match[2] || '3');
      const text = this.cleanText(match[3] || '');
      
      if (text && text.length > 0) {
        segments.push({
          start,
          duration,
          text
        });
      }
    }
    
    return segments;
  }

  private parseTimeString(timeStr: string): number {
    const parts = timeStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) : 0;
    
    return minutes * 60 + seconds + (milliseconds / 1000);
  }

  private cleanText(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
