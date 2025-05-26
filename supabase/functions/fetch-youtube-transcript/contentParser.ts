
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
      
      if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) {
        continue;
      }
      
      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/);
      
      if (timestampMatch) {
        if (currentCue && currentCue.text?.trim()) {
          transcript.push(currentCue as TranscriptSegment);
        }
        
        currentCue = {
          start: this.parseWebVTTTime(timestampMatch[1]),
          end: this.parseWebVTTTime(timestampMatch[2]),
          text: ''
        };
      } else if (currentCue && line) {
        let cleanText = line
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/<[^>]*>/g, '')
          .replace(/\{[^}]*\}/g, '')
          .trim();
        
        if (cleanText) {
          currentCue.text += (currentCue.text ? ' ' : '') + cleanText;
        }
      }
    }
    
    if (currentCue && currentCue.text?.trim()) {
      transcript.push(currentCue as TranscriptSegment);
    }
    
    return transcript.filter(entry => entry.text && entry.text.trim().length > 0);
  }

  private parseXML(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    const textRegex = /<text start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
    let match;
    
    while ((match = textRegex.exec(content)) !== null) {
      const startTime = parseFloat(match[1]);
      const duration = parseFloat(match[2]) || 5;
      const text = match[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      
      if (text) {
        transcript.push({
          start: startTime,
          end: startTime + duration,
          text: text
        });
      }
    }
    
    return transcript;
  }

  private parseSimpleText(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    const lines = content.split('\n');
    let timeOffset = 0;
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.startsWith('WEBVTT') && cleanLine.length > 5) {
        transcript.push({
          start: timeOffset,
          end: timeOffset + 5, // 5 second segments
          text: cleanLine
        });
        timeOffset += 5;
      }
    }
    
    return transcript;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private parseWebVTTTime(timeString: string): number {
    timeString = timeString.replace(',', '.');
    const parts = timeString.split(':');
    let hours = 0, minutes = 0, seconds = 0;
    
    if (parts.length === 3) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0], 10);
      seconds = parseFloat(parts[1]);
    }
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private formatTimeWithMilliseconds(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (ms > 0) {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
