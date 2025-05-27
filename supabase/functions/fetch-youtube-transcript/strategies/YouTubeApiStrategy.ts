
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { YouTubeAPI } from "../youtubeApi.ts";

export class YouTubeApiStrategy implements ITranscriptStrategy {
  private youtubeAPI: YouTubeAPI;

  constructor() {
    this.youtubeAPI = new YouTubeAPI();
  }

  getName(): string {
    return 'youtube-api';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    if (apiKey) {
      return await this.youtubeAPI.fetchWithAPI(videoId, apiKey);
    }
    return null;
  }
}
