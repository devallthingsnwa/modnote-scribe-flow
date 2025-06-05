import { corsHeaders, formatCurrentDateTime } from "./utils.ts";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface VideoMetadata {
  videoId?: string;
  title?: string;
  author?: string;
  url?: string;
  language?: string;
  extractionMethod?: string;
}

export class ContentParser {
  async processTranscriptContent(
    content: string, 
    source: string, 
    metadata?: VideoMetadata
  ): Promise<Response | null> {
    try {
      let transcript: TranscriptSegment[] = [];
      
      console.log(`🔄 Processing content from ${source}, length: ${content.length}`);
      
      if (content.includes('WEBVTT') || content.includes('-->')) {
        console.log("📝 Parsing as WebVTT format");
        transcript = this.parseWebVTT(content);
      } else if (content.includes('<text')) {
        console.log("📝 Parsing as XML format");
        transcript = this.parseXML(content);
      } else if (typeof content === 'string' && content.length > 0) {
        console.log("📝 Parsing as simple text");
        transcript = this.parseSimpleText(content);
      }
      
      console.log(`📊 Extracted ${transcript.length} transcript segments`);
      
      if (transcript.length === 0) {
        console.log("❌ No transcript segments extracted from content");
        return null;
      }
      
      // Format as RAW transcript text - NO MARKDOWN
      const rawTranscript = this.formatRawTranscript(transcript);

      console.log(`✅ Successfully extracted ${transcript.length} transcript segments via ${source}`);
      console.log(`📝 Raw transcript preview: ${rawTranscript.substring(0, 200)}...`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          transcript: rawTranscript, // RAW TEXT ONLY - no markdown
          metadata: {
            segments: transcript.length,
            duration: transcript.length > 0 ? transcript[transcript.length - 1].end : 0,
            hasTimestamps: true,
            source: source,
            videoId: metadata?.videoId || '',
            title: metadata?.title || 'Unknown Video',
            author: metadata?.author || 'Unknown Channel',
            url: metadata?.url || '',
            language: metadata?.language || 'en'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
      
    } catch (error) {
      console.error("❌ Error processing transcript content:", error);
      return null;
    }
  }

  private formatRawTranscript(segments: TranscriptSegment[]): string {
    // Return ONLY the raw transcript text - no formatting, headers, or markdown
    let rawText = segments
      .map(segment => segment.text.trim())
      .filter(text => text.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Preserve special tags but clean up transcript artifacts
    rawText = rawText
      .replace(/\[Music\]/gi, '[Musika]') // Standardize music tags
      .replace(/\[Applause\]/gi, '[Applause]')
      .replace(/\[Laughter\]/gi, '[Laughter]')
      .replace(/\[Inaudible\]/gi, '[Inaudible]')
      // Keep other bracketed content as-is
      .replace(/\s+/g, ' ')
      .trim();

    return rawText;
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
    
    // Enhanced XML parsing patterns
    const xmlPatterns = [
      /<text start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([^<]*)<\/text>/g,
      /<p t="([^"]*)"(?:\s+d="([^"]*)")?>([^<]*)<\/p>/g,
      /<subtitle start="([^"]*)"(?:\s+duration="([^"]*)")?>([^<]*)<\/subtitle>/g,
    ];
    
    for (const pattern of xmlPatterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const start = parseFloat(match[1] || '0');
        const duration = parseFloat(match[2] || '3'); // Default 3 seconds
        const text = this.cleanText(match[3] || '').trim();
        
        if (text && text.length > 0) {
          transcript.push({
            start: start,
            end: start + duration,
            text: text
          });
        }
      }
      
      if (transcript.length > 0) break; // Use first successful pattern
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
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
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
