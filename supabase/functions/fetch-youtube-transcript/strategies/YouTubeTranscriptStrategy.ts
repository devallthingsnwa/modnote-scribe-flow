
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class YouTubeTranscriptStrategy implements ITranscriptStrategy {
  getName(): string {
    return "youtube-transcript";
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    console.log(`🎬 Attempting YouTube transcript extraction for: ${videoId}`);
    
    try {
      // Enhanced transcript fetching with multiple attempts
      const transcriptData = await this.fetchTranscriptData(videoId, options);
      
      if (!transcriptData || transcriptData.length === 0) {
        console.warn('⚠️ No transcript data found');
        return null;
      }

      // Process and format transcript
      const formattedTranscript = this.formatTranscript(transcriptData, options);
      
      if (!formattedTranscript || formattedTranscript.length < 20) {
        console.warn('⚠️ Transcript too short or empty after formatting');
        return null;
      }

      console.log(`✅ YouTube transcript extracted: ${formattedTranscript.length} characters`);

      return new Response(
        JSON.stringify({
          success: true,
          transcript: formattedTranscript,
          metadata: {
            videoId,
            extractionMethod: 'youtube-transcript-api',
            segmentCount: Array.isArray(transcriptData) ? transcriptData.length : 0,
            processingTime: Date.now(),
            hasTimestamps: options.includeTimestamps || false,
            language: options.language || 'auto'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error(`❌ YouTube transcript strategy failed:`, error);
      return null;
    }
  }

  private async fetchTranscriptData(videoId: string, options: TranscriptOptions): Promise<any[]> {
    const urls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`
    ];

    for (const url of urls) {
      try {
        console.log(`🔍 Trying transcript URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.events && data.events.length > 0) {
            console.log(`✅ Found transcript data with ${data.events.length} events`);
            return data.events;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${url}:`, error);
        continue;
      }
    }

    throw new Error('No transcript data available from any source');
  }

  private formatTranscript(events: any[], options: TranscriptOptions): string {
    if (!events || events.length === 0) return '';

    try {
      let transcript = '';
      
      for (const event of events) {
        if (event.segs) {
          for (const segment of event.segs) {
            if (segment.utf8) {
              let text = segment.utf8.trim();
              
              if (text && text !== '\n') {
                // Add timestamps if requested
                if (options.includeTimestamps && event.tStartMs) {
                  const timestamp = this.formatTimestamp(parseInt(event.tStartMs));
                  transcript += `[${timestamp}] `;
                }
                
                transcript += text + ' ';
              }
            }
          }
        }
      }

      return transcript.trim();
    } catch (error) {
      console.error('Error formatting transcript:', error);
      return '';
    }
  }

  private formatTimestamp(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const sec = seconds % 60;
    const min = minutes % 60;
    
    if (hours > 0) {
      return `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    } else {
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
  }
}
