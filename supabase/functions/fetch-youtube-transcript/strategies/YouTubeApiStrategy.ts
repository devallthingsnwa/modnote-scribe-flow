
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class YouTubeApiStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'youtube-api-v3';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting YouTube API v3 caption extraction");
      
      const apiKey = Deno.env.get('YOUTUBE_API_KEY');
      if (!apiKey) {
        console.warn("YouTube API key not found, skipping API method");
        return null;
      }

      // Get caption tracks
      const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
      
      const captionsResponse = await fetch(captionsUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!captionsResponse.ok) {
        throw new Error(`YouTube API error: ${captionsResponse.status}`);
      }

      const captionsData = await captionsResponse.json();
      
      if (!captionsData.items || captionsData.items.length === 0) {
        console.log("No captions available via YouTube API");
        return null;
      }

      // Find best caption track (prefer English)
      const englishTrack = captionsData.items.find((track: any) => 
        track.snippet.language === 'en' || track.snippet.language === options.language
      ) || captionsData.items[0];

      if (!englishTrack) {
        return null;
      }

      // Download caption content
      const captionUrl = `https://www.googleapis.com/youtube/v3/captions/${englishTrack.id}?key=${apiKey}`;
      
      const captionResponse = await fetch(captionUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!captionResponse.ok) {
        throw new Error(`Caption download error: ${captionResponse.status}`);
      }

      const captionText = await captionResponse.text();
      
      if (captionText && captionText.length > 50) {
        console.log(`YouTube API extraction successful: ${captionText.length} characters`);

        return new Response(
          JSON.stringify({
            success: true,
            transcript: captionText,
            metadata: {
              videoId,
              language: englishTrack.snippet.language,
              extractionMethod: 'youtube-api-v3'
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      return null;
    } catch (error) {
      console.error("YouTube API extraction failed:", error);
      return null;
    }
  }
}
