
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class VideoPageStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'video-page-scraping';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting video page scraping for captions");
      
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Extract player response data
      const playerResponseMatch = html.match(/"playerResponse":\s*({.+?})\s*,\s*"/);
      if (!playerResponseMatch) {
        console.log("No player response found in page");
        return null;
      }

      let playerResponse;
      try {
        playerResponse = JSON.parse(playerResponseMatch[1]);
      } catch (e) {
        console.error("Failed to parse player response:", e);
        return null;
      }

      // Extract caption tracks
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
        console.log("No caption tracks found in player response");
        return null;
      }

      // Find English captions or first available
      const englishTrack = captionTracks.find((track: any) => 
        track.languageCode === 'en' || track.languageCode === (options.language || 'en')
      ) || captionTracks[0];

      if (!englishTrack || !englishTrack.baseUrl) {
        console.log("No suitable caption track found");
        return null;
      }

      // Download caption content
      const captionResponse = await fetch(englishTrack.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!captionResponse.ok) {
        throw new Error(`Caption download failed: ${captionResponse.status}`);
      }

      const captionXml = await captionResponse.text();
      
      // Parse XML captions
      const segments = this.parseXMLCaptions(captionXml);
      
      if (segments.length === 0) {
        console.log("No segments extracted from captions");
        return null;
      }

      // Format as timestamped transcript
      const formattedTranscript = segments
        .map(segment => {
          const startTime = this.formatTime(segment.start);
          const endTime = this.formatTime(segment.start + segment.duration);
          return `[${startTime} - ${endTime}] ${segment.text}`;
        })
        .join('\n');

      console.log(`Video page extraction successful: ${segments.length} segments`);

      return new Response(
        JSON.stringify({
          success: true,
          transcript: formattedTranscript,
          metadata: {
            videoId,
            segments: segments.length,
            duration: segments.length > 0 ? segments[segments.length - 1].start + segments[segments.length - 1].duration : 0,
            extractionMethod: 'video-page-scraping'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Video page extraction failed:", error);
      return null;
    }
  }

  private parseXMLCaptions(xmlContent: string): Array<{start: number, duration: number, text: string}> {
    const segments: Array<{start: number, duration: number, text: string}> = [];
    
    try {
      const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g;
      let match;
      
      while ((match = textRegex.exec(xmlContent)) !== null) {
        const start = parseFloat(match[1] || '0');
        const duration = parseFloat(match[2] || '3');
        const text = this.decodeXMLEntities(match[3] || '').trim();
        
        if (text && text.length > 0) {
          segments.push({
            start,
            duration,
            text
          });
        }
      }
    } catch (error) {
      console.error("Error parsing XML captions:", error);
    }
    
    return segments;
  }

  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
