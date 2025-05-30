
import { corsHeaders } from "./utils.ts";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export class ContentParser {
  async processTranscriptContent(content: string, source: string): Promise<Response | null> {
    try {
      let transcript: TranscriptSegment[] = [];
      
      if (content.includes('WEBVTT') || content.includes('-->')) {
        transcript = this.parseWebVTT(content);
      } else if (content.includes('<text')) {
        transcript = this.parseXML(content);
      } else if (typeof content === 'string' && content.length > 0) {
        // Try to parse as simple text
        transcript = this.parseSimpleText(content);
      }
      
      if (transcript.length === 0) {
        console.log("No transcript segments extracted from content");
        return null;
      }
      
      const formattedTranscript = transcript
        .map((entry) => {
          const startTime = this.formatTimeWithMilliseconds(entry.start);
          const endTime = this.formatTimeWithMilliseconds(entry.end);
          return `[${startTime} - ${endTime}] ${entry.text}`;
        })
        .join("\n");

      console.log(`Successfully extracted ${transcript.length} transcript segments via ${source}`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          transcript: formattedTranscript,
          metadata: {
            segments: transcript.length,
            duration: transcript.length > 0 ? transcript[transcript.length - 1].end : 0,
            hasTimestamps: true,
            source: source
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
      
    } catch (error) {
      console.error("Error processing transcript content:", error);
      return null;
    }
  }

  private parseWebVTT(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    const lines = content.split('\n');
    let currentCue: Partial<TranscriptSegment> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) {
        continue;
      }
      
      // Parse time stamps (00:01.234 --> 00:05.678)
      const timeMatch = line.match(/(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        if (currentCue && currentCue.text) {
          transcript.push(currentCue as TranscriptSegment);
        }
        
        currentCue = {
          start: this.parseTimeString(timeMatch[1]),
          end: this.parseTimeString(timeMatch[2]),
          text: ''
        };
      } else if (currentCue && line) {
        // This is transcript text
        currentCue.text = currentCue.text ? `${currentCue.text} ${line}` : line;
      }
    }
    
    // Add the last cue
    if (currentCue && currentCue.text) {
      transcript.push(currentCue as TranscriptSegment);
    }
    
    return transcript;
  }

  private parseXML(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    
    // Match XML text elements with start and dur attributes
    const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([^<]*)<\/text>/g;
    let match;
    
    while ((match = textRegex.exec(content)) !== null) {
      const start = parseFloat(match[1]);
      const duration = match[2] ? parseFloat(match[2]) : 3; // Default 3 seconds if no duration
      const text = this.cleanText(match[3]);
      
      if (text && text.trim()) {
        transcript.push({
          start: start,
          end: start + duration,
          text: text.trim()
        });
      }
    }
    
    return transcript.sort((a, b) => a.start - b.start);
  }

  private parseSimpleText(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    const lines = content.split('\n');
    let currentTime = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        transcript.push({
          start: currentTime,
          end: currentTime + 3, // Default 3 seconds per segment
          text: this.cleanText(trimmedLine)
        });
        currentTime += 3;
      }
    }
    
    return transcript;
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
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .trim();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatTimeWithMilliseconds(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    if (milliseconds > 0) {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
