
import { ContentParser } from "./contentParser.ts";
import { YouTubeAPI } from "./youtubeApi.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptOptions {
  language?: string;
  includeTimestamps?: boolean;
  format?: 'text' | 'json' | 'srt';
  maxRetries?: number;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  error?: string;
  metadata?: {
    videoId: string;
    language?: string;
    duration?: number;
    segmentCount?: number;
    extractionMethod: string;
  };
}

export class TranscriptExtractor {
  private contentParser: ContentParser;
  private youtubeAPI: YouTubeAPI;

  constructor() {
    this.contentParser = new ContentParser();
    this.youtubeAPI = new YouTubeAPI();
  }

  async extractTranscript(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    console.log(`Starting transcript extraction for video: ${videoId}`);

    // Try multiple extraction methods in order of preference
    const extractionMethods = [
      () => this.extractFromYouTubeAPI(videoId),
      () => this.extractFromVideoPage(videoId),
      () => this.extractFromCaptionTracks(videoId, options),
      () => this.extractFromAlternativeAPI(videoId),
      () => this.extractFromThirdPartyService(videoId)
    ];

    for (let i = 0; i < extractionMethods.length; i++) {
      try {
        console.log(`Attempting extraction method ${i + 1}`);
        const result = await extractionMethods[i]();
        
        if (result) {
          console.log(`Successfully extracted transcript using method ${i + 1}`);
          return result;
        }
      } catch (error) {
        console.warn(`Method ${i + 1} failed:`, error.message);
        continue;
      }
    }

    // If all methods fail, return a structured error response
    console.error("All transcript extraction methods failed");
    return new Response(
      JSON.stringify({
        success: false,
        transcript: "No transcript available for this video. The video may not have captions enabled or may be restricted.",
        error: "All extraction methods failed",
        metadata: {
          videoId,
          segments: 0,
          duration: 0,
          extractionMethod: 'failed'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  private async extractFromYouTubeAPI(videoId: string): Promise<Response | null> {
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    if (apiKey) {
      return await this.youtubeAPI.fetchWithAPI(videoId, apiKey);
    }
    return null;
  }

  private async extractFromVideoPage(videoId: string): Promise<Response | null> {
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

  private async extractFromCaptionTracks(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
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

  private async extractFromAlternativeAPI(videoId: string): Promise<Response | null> {
    try {
      console.log("Attempting alternative API extraction");
      
      // Try alternative transcript API
      const response = await fetch(`https://youtube-transcript-api.herokuapp.com/transcript/${videoId}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        // Format the transcript
        const formattedTranscript = data
          .map((item: any) => {
            const startTime = this.contentParser.formatTime(item.start || 0);
            const endTime = this.contentParser.formatTime((item.start || 0) + (item.duration || 0));
            return `[${startTime} - ${endTime}] ${item.text || ''}`;
          })
          .join('\n');

        return new Response(
          JSON.stringify({
            success: true,
            transcript: formattedTranscript,
            metadata: {
              videoId,
              segments: data.length,
              duration: data[data.length - 1]?.start + data[data.length - 1]?.duration || 0,
              extractionMethod: 'alternative-api'
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
      console.error("Alternative API extraction failed:", error);
      return null;
    }
  }

  private async extractFromThirdPartyService(videoId: string): Promise<Response | null> {
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
