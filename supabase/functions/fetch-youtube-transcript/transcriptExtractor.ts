
import { corsHeaders } from "./utils.ts";
import { FallbackMethods } from "./fallbackMethods.ts";

export interface TranscriptOptions {
  language?: string;
  includeTimestamps?: boolean;
  format?: 'text' | 'json' | 'srt';
  maxRetries?: number;
  extendedTimeout?: boolean;
  chunkProcessing?: boolean;
  retryCount?: number;
  qualityLevel?: string;
  multipleStrategies?: boolean;
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
    title?: string;
    author?: string;
    language?: string;
    duration?: number;
    segmentCount?: number;
    extractionMethod?: string;
    processingTime?: number;
    qualityScore?: number;
  };
}

export class TranscriptExtractor {
  async extractTranscriptWithExtendedHandling(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    const startTime = Date.now();
    console.log(`Enhanced extraction for ${videoId} with optimized processing`);

    try {
      // Fast path: Try most reliable methods first
      const fastResult = await this.tryFastExtractionMethods(videoId, options);
      if (fastResult) {
        console.log("Fast extraction successful");
        return fastResult;
      }

      // Fallback to comprehensive methods
      console.log("Attempting comprehensive extraction methods...");
      const fallbackMethods = new FallbackMethods();
      const fallbackResult = await fallbackMethods.tryAllMethods(videoId, options);
      
      if (fallbackResult) {
        console.log("Fallback methods extraction successful");
        return fallbackResult;
      }

      // Create enhanced fallback response with processing metrics
      console.log("Creating optimized fallback response...");
      return this.createOptimizedFallbackResponse(videoId, startTime, options);

    } catch (error) {
      console.error("Error in transcript extraction:", error);
      return this.createOptimizedFallbackResponse(videoId, startTime, options, error.message);
    }
  }

  private async tryFastExtractionMethods(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    const fastMethods = [
      () => this.tryYouTubeTranscriptAPI(videoId, options),
      () => this.tryDirectCaptionAPI(videoId, options),
    ];

    for (const method of fastMethods) {
      try {
        const result = await Promise.race([
          method(),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Method timeout')), 15000)
          )
        ]);
        
        if (result) return result;
      } catch (error) {
        console.log(`Fast method failed: ${error.message}`);
        continue;
      }
    }

    return null;
  }

  private async tryYouTubeTranscriptAPI(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("🚀 Trying optimized YouTube transcript API...");
      
      const apiUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`
      ];

      for (const url of apiUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': `https://www.youtube.com/watch?v=${videoId}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data?.events && data.events.length > 0) {
              const transcript = this.processTranscriptEvents(data.events);
              
              if (transcript && transcript.length > 50) {
                return new Response(
                  JSON.stringify({
                    success: true,
                    transcript,
                    metadata: {
                      videoId,
                      segmentCount: data.events.length,
                      extractionMethod: 'youtube-transcript-api-optimized',
                      language: 'en',
                      processingTime: Date.now() - Date.now(),
                      qualityScore: 95
                    }
                  }),
                  {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                  }
                );
              }
            }
          }
        } catch (error) {
          console.log(`API URL failed: ${url} - ${error.message}`);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error("YouTube transcript API failed:", error);
      return null;
    }
  }

  private async tryDirectCaptionAPI(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    try {
      console.log("🎯 Trying direct caption API...");
      
      const captionUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`
      ];

      for (const url of captionUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (response.ok) {
            const xmlContent = await response.text();
            
            if (xmlContent.includes('<text')) {
              const transcript = this.parseXMLToText(xmlContent);
              
              if (transcript && transcript.length > 50) {
                return new Response(
                  JSON.stringify({
                    success: true,
                    transcript,
                    metadata: {
                      videoId,
                      extractionMethod: 'direct-caption-api-optimized',
                      language: options.language || 'en',
                      processingTime: Date.now() - Date.now(),
                      qualityScore: 90
                    }
                  }),
                  {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                  }
                );
              }
            }
          }
        } catch (error) {
          console.log(`Caption URL failed: ${url} - ${error.message}`);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error("Direct caption API failed:", error);
      return null;
    }
  }

  private processTranscriptEvents(events: any[]): string {
    let transcript = '';
    
    for (const event of events) {
      if (event.segs) {
        for (const segment of event.segs) {
          if (segment.utf8) {
            let text = segment.utf8.trim();
            if (text && text !== '\n') {
              transcript += text + ' ';
            }
          }
        }
      }
    }

    return transcript.trim();
  }

  private parseXMLToText(xmlContent: string): string {
    try {
      const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
      let transcript = '';
      let match;
      
      while ((match = textRegex.exec(xmlContent)) !== null) {
        const text = this.decodeXMLEntities(match[1] || '').trim();
        if (text && text.length > 0) {
          transcript += text + ' ';
        }
      }
      
      return transcript.trim();
    } catch (error) {
      console.error("Error parsing XML:", error);
      return '';
    }
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

  private createOptimizedFallbackResponse(videoId: string, startTime: number, options: TranscriptOptions, errorMessage?: string): Response {
    console.log("Creating optimized fallback response for video:", videoId);
    
    const processingTime = Date.now() - startTime;
    
    const fallbackTranscript = `This video transcript could not be automatically extracted. Common reasons include:

- No captions available on the video
- Private or restricted content
- Live stream or premiere content
- Technical limitations with caption access

You can still use this note to:
- Add manual notes while watching the video
- Copy and paste captions if available on YouTube
- Summarize key points from the video content
- Store timestamps and references for future use

To access captions manually:
1. Go to the video on YouTube
2. Click the CC (Closed Captions) button
3. Click the settings gear → Subtitles/CC → Auto-translate (if needed)
4. Copy the text and paste it here`;

    const transcriptResponse: TranscriptResponse = {
      success: true,
      transcript: fallbackTranscript,
      metadata: {
        videoId,
        extractionMethod: 'optimized-smart-fallback',
        processingTime,
        qualityScore: 0,
        segmentCount: 0
      }
    };

    return new Response(
      JSON.stringify(transcriptResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}
