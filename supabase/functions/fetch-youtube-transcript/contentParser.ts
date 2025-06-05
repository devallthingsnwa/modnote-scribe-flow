export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      
      if (content.includes('WEBVTT') || content.includes('-->')) {
        transcript = this.parseWebVTT(content);
      } else if (content.includes('<text')) {
        transcript = this.parseXML(content);
      } else if (typeof content === 'string' && content.length > 0) {
        transcript = this.parseSimpleText(content);
      }
      
      if (transcript.length === 0) {
        console.log("No transcript segments extracted from content");
        return null;
      }
      
      // Format as RAW text only - no markdown, no headers, just spoken words
      const rawTranscript = this.formatAsRawText(transcript);

      console.log(`Successfully extracted ${transcript.length} transcript segments via ${source}`);
      console.log(`Raw transcript preview: ${rawTranscript.substring(0, 200)}...`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          transcript: rawTranscript, // RAW TEXT ONLY
          metadata: {
            segments: transcript.length,
            duration: transcript.length > 0 ? transcript[transcript.length - 1].end : 0,
            hasTimestamps: false, // No timestamps in output
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
      console.error("Error processing transcript content:", error);
      return null;
    }
  }

  private formatAsRawText(segments: TranscriptSegment[]): string {
    // Extract ONLY the spoken words, preserve music tags, no formatting
    let rawText = segments
      .map(segment => segment.text.trim())
      .filter(text => text.length > 0)
      .join(' ');

    // Clean and standardize music/sound tags
    rawText = rawText
      .replace(/\[Music\]/gi, '[Musika]')
      .replace(/\[♪\]/gi, '[Musika]')
      .replace(/\[♫\]/gi, '[Musika]')
      .replace(/\[música\]/gi, '[Musika]')
      .replace(/\[musique\]/gi, '[Musika]')
      .replace(/\[音楽\]/gi, '[Musika]')
      .replace(/\[Applause\]/gi, '[Palakpakan]')
      .replace(/\[Laughter\]/gi, '[Tawa]')
      .replace(/\[Inaudible\]/gi, '[Hindi marinig]')
      // Keep other bracketed content as is
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Return ONLY the raw spoken text with preserved tags
    return rawText;
  }

  private parseWebVTT(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    const lines = content.split('\n');
    let currentCue: Partial<TranscriptSegment> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) {
        continue;
      }
      
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
        currentCue.text = currentCue.text ? `${currentCue.text} ${line}` : line;
      }
    }
    
    if (currentCue && currentCue.text) {
      transcript.push(currentCue as TranscriptSegment);
    }
    
    return transcript;
  }

  private parseXML(content: string): TranscriptSegment[] {
    const transcript: TranscriptSegment[] = [];
    
    const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([^<]*)<\/text>/g;
    let match;
    
    while ((match = textRegex.exec(content)) !== null) {
      const start = parseFloat(match[1]);
      const duration = match[2] ? parseFloat(match[2]) : 3;
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
          end: currentTime + 3,
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
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
  }
}

export function validateVideoId(videoId: string): boolean {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }
  
  // YouTube video IDs are 11 characters long and contain alphanumeric characters, hyphens, and underscores
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdRegex.test(videoId);
}

export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

export function normalizeVideoUrl(url: string): string {
  const videoId = extractVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
}

export function isPlaylist(url: string): boolean {
  return url.includes('list=') && url.includes('youtube.com');
}

export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

export function extractVideoTitle(html: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].replace(' - YouTube', '').trim();
  }
  return 'Unknown Video';
}

export function extractChannelName(html: string): string {
  const patterns = [
    /"ownerChannelName":"([^"]+)"/,
    /"author":"([^"]+)"/,
    /\"channelName\":\"([^\"]+)\"/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return 'Unknown Channel';
}
