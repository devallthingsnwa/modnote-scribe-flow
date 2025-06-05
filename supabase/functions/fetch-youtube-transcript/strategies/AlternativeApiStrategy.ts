
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class AlternativeApiStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'alternative-api';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting alternative API transcript extraction");
      
      // Try youtube-transcript-api alternative endpoints
      const endpoints = [
        `https://www.youtube-transcript-api.com/api/transcript?video_id=${videoId}&lang=${options.language || 'en'}`,
        `https://api.streamelements.com/kappa/v2/youtube/transcript/${videoId}`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying alternative API: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; TranscriptBot/1.0)',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data && (data.transcript || data.text || Array.isArray(data))) {
              let transcript = '';
              
              if (Array.isArray(data)) {
                // Handle array format
                transcript = data
                  .filter(item => item.text || item.snippet)
                  .map((item, index) => {
                    const text = item.text || item.snippet || '';
                    const start = item.start || item.offset || (index * 3);
                    const duration = item.duration || 3;
                    const startTime = this.formatTime(start);
                    const endTime = this.formatTime(start + duration);
                    return `[${startTime} - ${endTime}] ${text.trim()}`;
                  })
                  .join('\n');
              } else if (data.transcript) {
                transcript = data.transcript;
              } else if (data.text) {
                transcript = data.text;
              }

              if (transcript && transcript.length > 100) {
                console.log(`Alternative API extraction successful: ${transcript.length} characters`);

                return new Response(
                  JSON.stringify({
                    success: true,
                    transcript: transcript,
                    metadata: {
                      videoId,
                      extractionMethod: 'alternative-api'
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
          console.log(`Alternative API failed: ${endpoint}`, error.message);
        }
      }

      return null;
    } catch (error) {
      console.error("Alternative API extraction failed:", error);
      return null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
