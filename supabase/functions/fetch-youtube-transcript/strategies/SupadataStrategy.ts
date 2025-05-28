
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
      
      // Try multiple API approaches for better success rate
      const apiAttempts = [
        // Primary: video ID with text format
        {
          url: `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
          description: 'video ID with text format'
        },
        // Fallback 1: video ID with segments
        {
          url: `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`,
          description: 'video ID with segments'
        },
        // Fallback 2: with language specified
        {
          url: `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true&lang=${language}`,
          description: 'video ID with language and text'
        }
      ];

      for (const attempt of apiAttempts) {
        console.log(`Calling Supadata API (${attempt.description}) for video ${videoId}`);

        try {
          const response = await fetch(attempt.url, {
            method: 'GET',
            headers: {
              'x-api-key': supadataApiKey,
              'Accept': 'application/json',
              'User-Agent': 'YouTube-Transcript-Extractor/1.0'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Supadata API error (${attempt.description}): ${response.status} - ${errorText}`);
            
            // Log specific error types but continue to next attempt
            if (response.status === 401) {
              console.error("Supadata API authentication failed - check API key");
            } else if (response.status === 404) {
              console.warn("Video not found or no transcript available via Supadata");
            } else if (response.status === 429) {
              console.warn("Supadata API rate limit exceeded");
              // For rate limits, wait a bit before trying next approach
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            continue; // Try next approach
          }

          const data = await response.json();
          console.log("Supadata API response:", JSON.stringify(data, null, 2));
          
          // Enhanced response validation
          if (!data) {
            console.warn(`Supadata API returned null response (${attempt.description})`);
            continue;
          }

          // Check for various response formats
          let transcriptText = '';
          let segments = [];
          let detectedLanguage = language;
          
          // Handle different response structures
          if (data.content && typeof data.content === 'string' && data.content.trim().length > 0) {
            transcriptText = data.content.trim();
            console.log(`Found transcript in 'content' field: ${transcriptText.length} characters`);
          } else if (data.transcript && typeof data.transcript === 'string' && data.transcript.trim().length > 0) {
            transcriptText = data.transcript.trim();
            console.log(`Found transcript in 'transcript' field: ${transcriptText.length} characters`);
          } else if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
            segments = data.segments;
            console.log(`Found ${segments.length} transcript segments`);
            
            // Build transcript from segments
            if (includeTimestamps) {
              transcriptText = segments
                .map((segment: any) => {
                  if (segment.text && segment.text.trim()) {
                    if (segment.start !== undefined) {
                      const startTime = this.formatTimestamp(segment.start || 0);
                      const endTime = this.formatTimestamp((segment.start || 0) + (segment.duration || 3));
                      return `[${startTime} - ${endTime}] ${segment.text.trim()}`;
                    }
                    return segment.text.trim();
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
          } else if (data.text && typeof data.text === 'string' && data.text.trim().length > 0) {
            transcriptText = data.text.trim();
            console.log(`Found transcript in 'text' field: ${transcriptText.length} characters`);
          }

          // Update detected language
          if (data.language) {
            detectedLanguage = data.language;
          }

          // Validate final transcript
          if (transcriptText && transcriptText.length > 10) {
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
                  availableLanguages: data.available_languages || data.availableLanguages || [],
                  credits: data.credits_used || data.creditsUsed || 1,
                  apiAttempt: attempt.description
                }
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          } else {
            console.warn(`Supadata API returned transcript but content too short (${attempt.description}): "${transcriptText}"`);
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
