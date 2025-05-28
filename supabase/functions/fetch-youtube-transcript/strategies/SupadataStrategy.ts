
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
      
      // Build the API URL
      const apiUrl = new URL('https://api.supadata.ai/v1/youtube/transcript');
      apiUrl.searchParams.append('videoId', videoId);
      apiUrl.searchParams.append('text', 'true');
      if (language) {
        apiUrl.searchParams.append('lang', language);
      }

      console.log(`Calling Supadata API for video ${videoId} with language ${language}`);

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': supadataApiKey,
          'Accept': 'application/json',
          'User-Agent': 'YouTube-Transcript-Extractor/1.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Supadata API error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          console.error("Supadata API authentication failed - check API key");
        } else if (response.status === 404) {
          console.warn("Video not found or no transcript available via Supadata");
        } else if (response.status === 429) {
          console.warn("Supadata API rate limit exceeded");
        }
        
        return null;
      }

      const data = await response.json();
      
      if (!data || !data.content) {
        console.warn("Supadata API returned empty or invalid response");
        return null;
      }

      // Format the transcript content
      let transcriptText = data.content;
      
      // If we have segments and want timestamps, format accordingly
      if (data.segments && includeTimestamps && Array.isArray(data.segments)) {
        transcriptText = data.segments
          .map((segment: any) => {
            const startTime = this.formatTimestamp(segment.start || 0);
            const endTime = this.formatTimestamp((segment.start || 0) + (segment.duration || 0));
            return `[${startTime} - ${endTime}] ${segment.text || ''}`;
          })
          .join('\n');
      }

      if (transcriptText && transcriptText.length > 50) {
        console.log(`Supadata API extraction successful: ${transcriptText.length} characters`);

        return new Response(
          JSON.stringify({
            success: true,
            transcript: transcriptText,
            metadata: {
              videoId,
              language: data.language || language,
              extractionMethod: 'supadata-api',
              segmentCount: data.segments ? data.segments.length : 0,
              availableLanguages: data.available_languages || []
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      console.warn("Supadata API returned transcript but content appears empty");
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
