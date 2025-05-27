
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { ContentParser } from "../contentParser.ts";

export class VideoPageStrategy implements ITranscriptStrategy {
  private contentParser: ContentParser;

  constructor() {
    this.contentParser = new ContentParser();
  }

  getName(): string {
    return 'youtube-page-extraction';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting to extract from YouTube video page");
      
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract captions data from the page
      const captionsRegex = /"captions":(\{.*?\}),"videoDetails"/s;
      const match = html.match(captionsRegex);
      
      if (!match) {
        console.log("No captions data found in video page");
        return null;
      }

      const captionsData = JSON.parse(match[1]);
      const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!tracks || tracks.length === 0) {
        console.log("No caption tracks found");
        return null;
      }

      // Get the best available track (prefer auto-generated English)
      const preferredTrack = tracks.find((track: any) => 
        track.languageCode === 'en' || track.languageCode.startsWith('en')
      ) || tracks[0];

      if (!preferredTrack?.baseUrl) {
        console.log("No suitable caption track found");
        return null;
      }

      // Fetch the actual transcript content
      const transcriptResponse = await fetch(preferredTrack.baseUrl);
      const transcriptContent = await transcriptResponse.text();
      
      return await this.contentParser.processTranscriptContent(
        transcriptContent, 
        'youtube-page-extraction'
      );

    } catch (error) {
      console.error("Video page extraction failed:", error);
      return null;
    }
  }
}
