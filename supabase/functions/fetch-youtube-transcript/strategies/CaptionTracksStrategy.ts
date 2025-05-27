
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { ContentParser } from "../contentParser.ts";

export class CaptionTracksStrategy implements ITranscriptStrategy {
  private contentParser: ContentParser;

  constructor() {
    this.contentParser = new ContentParser();
  }

  getName(): string {
    return 'caption-tracks-api';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting to extract from caption tracks API");
      
      // Try various caption API endpoints
      const apiEndpoints = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`
      ];
      
      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const content = await response.text();
            
            if (content.includes('<text')) {
              return await this.contentParser.processTranscriptContent(
                content, 
                'caption-tracks-api'
              );
            }
          }
        } catch (_) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Caption tracks extraction failed:", error);
      return null;
    }
  }
}
