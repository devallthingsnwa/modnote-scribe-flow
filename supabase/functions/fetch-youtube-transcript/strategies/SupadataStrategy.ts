
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class SupadataStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'supadata-api';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting transcript extraction with Supadata API");
      
      const supadataApiKey = Deno.env.get('SUPADATA_API_KEY');
      if (!supadataApiKey) {
        console.warn("Supadata API key not found, skipping Supadata method");
        return null;
      }

      const language = options.language || 'en';
      const includeTimestamps = options.includeTimestamps !== false;
      
      // Updated API endpoints based on correct Supadata documentation
      const apiAttempts = [
        // Primary: Correct transcript endpoint
        {
          url: `https://api.supadata.ai/youtube/transcript`,
          method: 'POST',
          body: {
            video_id: videoId,
            language: language,
            include_timestamps: includeTimestamps,
            format: 'json'
          },
          description: 'Main transcript endpoint'
        },
        // Fallback 1: Alternative URL format
        {
          url: `https://api.supadata.ai/transcript`,
          method: 'POST',
          body: {
            source: 'youtube',
            video_id: videoId,
            language: language,
            timestamps: includeTimestamps
          },
          description: 'Alternative transcript endpoint'
        },
        // Fallback 2: Full URL approach
        {
          url: `https://api.supadata.ai/extract`,
          method: 'POST',
          body: {
            url: `https://www.youtube.com/watch?v=${videoId}`,
            type: 'transcript',
            language: language,
            include_timestamps: includeTimestamps
          },
          description: 'URL-based extraction'
        }
      ];

      for (const attempt of apiAttempts) {
        console.log(`Calling Supadata API (${attempt.description}) for video ${videoId}`);

        try {
          const response = await fetch(attempt.url, {
            method: attempt.method,
            headers: {
              'Authorization': `Bearer ${supadataApiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'YouTube-Transcript-Service/1.0'
            },
            body: JSON.stringify(attempt.body)
          });

          console.log(`Supadata API response status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Supadata API error (${attempt.description}): ${response.status} - ${errorText}`);
            
            if (response.status === 401) {
              console.error("Supadata API authentication failed - check API key");
              return null; // Don't try other endpoints if auth fails
            } else if (response.status === 429) {
              console.warn("Supadata API rate limit exceeded");
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }
            
            continue;
          }

          let data;
          const responseText = await response.text();
          
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.warn("Failed to parse JSON response, treating as plain text");
            if (responseText.trim().length > 50) {
              data = { transcript: responseText.trim() };
            } else {
              continue;
            }
          }
          
          console.log("Supadata API response data:", data);
          
          if (!data) {
            console.warn(`Supadata API returned null response (${attempt.description})`);
            continue;
          }

          // Enhanced response parsing
          let transcriptText = '';
          let segments = [];
          let detectedLanguage = language;
          
          // Handle various response structures
          if (data.success === false) {
            console.warn(`Supadata API indicated failure: ${data.error || data.message}`);
            continue;
          }

          // Extract transcript from different possible fields
          if (data.transcript) {
            transcriptText = data.transcript;
          } else if (data.text) {
            transcriptText = data.text;
          } else if (data.content) {
            transcriptText = data.content;
          } else if (data.data?.transcript) {
            transcriptText = data.data.transcript;
          } else if (data.data?.text) {
            transcriptText = data.data.text;
          } else if (data.segments && Array.isArray(data.segments)) {
            segments = data.segments;
          } else if (data.data?.segments && Array.isArray(data.data.segments)) {
            segments = data.data.segments;
          }

          // Build transcript from segments if we have them
          if (segments.length > 0) {
            console.log(`Found ${segments.length} transcript segments`);
            
            if (includeTimestamps) {
              transcriptText = segments
                .map((segment: any) => {
                  if (segment.text && segment.text.trim()) {
                    const startTime = this.formatTimestamp(segment.start || segment.timestamp || 0);
                    const endTime = this.formatTimestamp((segment.start || segment.timestamp || 0) + (segment.duration || 3));
                    return `[${startTime} - ${endTime}] ${segment.text.trim()}`;
                  }
                  return '';
                })
                .filter(text => text.length > 0)
                .join('\n');
            } else {
              transcriptText = segments
                .map((segment: any) => segment.text ? segment.text.trim() : '')
                .filter(text => text.length > 0)
                .join(' ');
            }
          }

          // Update detected language
          if (data.language || data.data?.language) {
            detectedLanguage = data.language || data.data.language;
          }

          // Validate final transcript
          if (transcriptText && transcriptText.trim().length > 20) {
            transcriptText = transcriptText.trim();
            console.log(`Supadata API extraction successful (${attempt.description}): ${transcriptText.length} characters`);

            return new Response(
              JSON.stringify({
                success: true,
                transcript: transcriptText,
                metadata: {
                  videoId,
                  language: detectedLanguage,
                  extractionMethod: 'supadata-api',
                  segmentCount: segments.length || 0,
                  apiAttempt: attempt.description,
                  provider: 'supadata',
                  quality: transcriptText.length > 1000 ? 'high' : transcriptText.length > 500 ? 'medium' : 'basic'
                }
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          } else {
            console.warn(`Supadata API returned transcript but content too short (${attempt.description}): "${transcriptText?.substring(0, 100)}..."`);
          }

        } catch (requestError) {
          console.error(`Supadata API request failed (${attempt.description}):`, requestError);
          continue;
        }
      }

      console.warn("All Supadata API attempts failed or returned insufficient content");
      return null;

    } catch (error) {
      console.error("Supadata API extraction failed:", error);
      return null;
    }
  }

  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
