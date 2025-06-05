
import { ContentParser } from "./contentParser.ts";
import { corsHeaders } from "./utils.ts";

export class YouTubeAPI {
  private contentParser: ContentParser;

  constructor() {
    this.contentParser = new ContentParser();
  }

  async fetchWithAPI(videoId: string, apiKey: string): Promise<Response | null> {
    try {
      const apiResponse = await fetch(`https://api.youtubetranscript.io/transcript?video_id=${videoId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'Lovable-App/1.0'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      console.log(`API Response status: ${apiResponse.status}`);

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log("API Response received:", JSON.stringify(apiData).substring(0, 200));
        
        if (apiData.transcript && Array.isArray(apiData.transcript) && apiData.transcript.length > 0) {
          // Format the transcript with timestamps
          const formattedTranscript = apiData.transcript
            .map((segment: any) => {
              const startTime = this.contentParser.formatTime(segment.start || 0);
              const endTime = this.contentParser.formatTime((segment.start || 0) + (segment.duration || 0));
              return `[${startTime} - ${endTime}] ${segment.text}`;
            })
            .join("\n");

          console.log(`Successfully extracted ${apiData.transcript.length} transcript segments via API`);

          return new Response(
            JSON.stringify({ 
              transcript: formattedTranscript,
              metadata: {
                segments: apiData.transcript.length,
                duration: apiData.transcript[apiData.transcript.length - 1]?.start + apiData.transcript[apiData.transcript.length - 1]?.duration || 0,
                hasTimestamps: true,
                source: 'youtube-transcript-api'
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          console.log("API returned empty or invalid transcript data");
        }
      } else {
        const errorText = await apiResponse.text();
        console.log(`API Error Response: ${errorText}`);
      }
    } catch (error) {
      console.log("YouTube Transcript API error:", error.message);
    }

    return null;
  }
}
