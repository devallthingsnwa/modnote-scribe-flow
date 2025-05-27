
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { ContentParser } from "../contentParser.ts";

export class EmbedExtractionStrategy implements ITranscriptStrategy {
  private contentParser: ContentParser;

  constructor() {
    this.contentParser = new ContentParser();
  }

  getName(): string {
    return 'embed-extraction';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting third-party service extraction");
      
      // Try a different approach using embed page
      const response = await fetch(`https://www.youtube.com/embed/${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      // Extract any available transcript data from embed page
      // This is a fallback method and may not always work
      const captionRegex = /"captionTracks":\[\{"baseUrl":"([^"]+)"/;
      const match = html.match(captionRegex);
      
      if (match && match[1]) {
        const captionUrl = match[1].replace(/\\u0026/g, '&');
        const transcriptResponse = await fetch(captionUrl);
        const transcriptContent = await transcriptResponse.text();
        
        return await this.contentParser.processTranscriptContent(
          transcriptContent,
          'embed-extraction'
        );
      }
      
      return null;
    } catch (error) {
      console.error("Third-party service extraction failed:", error);
      return null;
    }
  }
}
