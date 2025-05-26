
import { YouTubeAPI } from "./youtubeApi.ts";
import { FallbackMethods } from "./fallbackMethods.ts";
import { corsHeaders } from "./utils.ts";

export class TranscriptExtractor {
  private youtubeApi: YouTubeAPI;
  private fallbackMethods: FallbackMethods;

  constructor() {
    this.youtubeApi = new YouTubeAPI();
    this.fallbackMethods = new FallbackMethods();
  }

  async extractTranscript(videoId: string): Promise<Response> {
    // Try YouTube Transcript API first
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    
    if (apiKey) {
      console.log("Attempting YouTube Transcript API...");
      try {
        const result = await this.youtubeApi.fetchWithAPI(videoId, apiKey);
        if (result) return result;
      } catch (error) {
        console.log("YouTube Transcript API failed:", error.message);
      }
    } else {
      console.log("No YouTube Transcript API key found, skipping API method");
    }
    
    // Enhanced fallback methods
    console.log("Trying fallback transcript extraction methods...");
    return await this.fallbackMethods.tryAllMethods(videoId);
  }
}
