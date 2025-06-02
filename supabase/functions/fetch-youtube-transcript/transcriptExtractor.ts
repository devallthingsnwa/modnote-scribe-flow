
import { corsHeaders } from "./utils.ts";

export class TranscriptExtractor {
  async extractTranscriptWithExtendedHandling(videoId: string, options: any = {}) {
    const isExtendedTimeout = options.extendedTimeout || false;
    const baseTimeout = isExtendedTimeout ? 120000 : 60000; // 2 minutes for extended, 1 minute for normal
    const maxRetries = options.maxRetries || 3;
    
    console.log(`Enhanced extraction for ${videoId} with ${isExtendedTimeout ? 'extended' : 'normal'} timeout (${baseTimeout}ms)`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Enhanced attempt ${attempt}/${maxRetries} for video ${videoId}`);
        
        const result = await this.extractWithTimeout(videoId, baseTimeout, attempt);
        
        if (result.success) {
          console.log(`✅ Success on attempt ${attempt}: ${result.transcript?.length || 0} characters`);
          return new Response(
            JSON.stringify(result),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // If not the last attempt, continue to retry
        if (attempt < maxRetries) {
          const delay = attempt === 1 ? 3000 : (attempt === 2 ? 8000 : 15000);
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Attempt ${attempt} error:`, error.message);
        
        if (attempt === maxRetries) {
          return new Response(
            JSON.stringify({
              success: false,
              transcript: `Unable to extract transcript after ${maxRetries} attempts. This video may be very long or have restricted captions.`,
              error: `All ${maxRetries} attempts failed: ${error.message}`,
              metadata: {
                videoId,
                attempts: maxRetries,
                extractionMethod: 'enhanced-retry',
                lastError: error.message
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }
  }

  private async extractWithTimeout(videoId: string, timeout: number, attempt: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Timeout after ${timeout}ms on attempt ${attempt}`);
      controller.abort();
    }, timeout);

    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Enhanced headers for better compatibility
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`Fetched HTML content: ${html.length} characters`);

      // Enhanced parsing for longer videos
      return await this.parseVideoDataWithEnhancedHandling(html, videoId, attempt);

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms (attempt ${attempt})`);
      }
      
      throw error;
    }
  }

  private async parseVideoDataWithEnhancedHandling(html: string, videoId: string, attempt: number) {
    try {
      // Extract player response with enhanced regex
      const playerResponseRegex = /"ytInitialPlayerResponse"\s*:\s*({.+?})\s*(?:;|\n)/;
      const match = html.match(playerResponseRegex);
      
      if (!match) {
        throw new Error("Could not find ytInitialPlayerResponse in page");
      }

      const playerResponse = JSON.parse(match[1]);
      console.log(`Parsed player response on attempt ${attempt}`);

      // Check for captions
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
        return {
          success: false,
          transcript: "No captions available for this video. The video may not have subtitles or they may be disabled.",
          error: "No caption tracks found",
          metadata: {
            videoId,
            extractionMethod: 'enhanced-parsing',
            attempt,
            hasPlayerResponse: true,
            captionTracks: 0
          }
        };
      }

      console.log(`Found ${captionTracks.length} caption tracks`);

      // Select best caption track with preference for English
      let selectedTrack = captionTracks[0];
      for (const track of captionTracks) {
        if (track.languageCode === 'en' || track.vssId?.includes('en') || track.name?.simpleText?.toLowerCase().includes('english')) {
          selectedTrack = track;
          console.log(`Selected English track: ${track.name?.simpleText || track.languageCode}`);
          break;
        }
      }

      // Fetch and parse captions with enhanced handling
      const transcript = await this.fetchCaptionsWithEnhancedHandling(selectedTrack, videoId, attempt);
      
      if (!transcript) {
        throw new Error("Failed to extract transcript content");
      }

      // Enhanced metadata
      const videoDetails = playerResponse?.videoDetails;
      const duration = videoDetails?.lengthSeconds ? parseInt(videoDetails.lengthSeconds) : 0;
      const isLongVideo = duration > 1800; // 30+ minutes
      
      return {
        success: true,
        transcript,
        metadata: {
          videoId,
          title: videoDetails?.title || 'Unknown Title',
          duration,
          isLongVideo,
          extractionMethod: 'enhanced-captions',
          attempt,
          captionLanguage: selectedTrack.languageCode || 'unknown',
          segmentCount: transcript.split('\n').length,
          transcriptLength: transcript.length
        }
      };

    } catch (error) {
      console.error(`Enhanced parsing error on attempt ${attempt}:`, error);
      throw new Error(`Parse error: ${error.message}`);
    }
  }

  private async fetchCaptionsWithEnhancedHandling(captionTrack: any, videoId: string, attempt: number): Promise<string | null> {
    try {
      let captionUrl = captionTrack.baseUrl;
      
      if (!captionUrl) {
        throw new Error("No caption URL found in track");
      }

      // Ensure absolute URL
      if (!captionUrl.startsWith('http')) {
        captionUrl = `https://www.youtube.com${captionUrl}`;
      }

      // Request WebVTT format for better parsing
      if (!captionUrl.includes('fmt=')) {
        captionUrl += captionUrl.includes('?') ? '&fmt=vtt' : '?fmt=vtt';
      }

      console.log(`Fetching captions from: ${captionUrl.substring(0, 100)}...`);

      // Extended timeout for caption fetching
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds for captions

      const response = await fetch(captionUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Caption fetch failed: ${response.status}`);
      }

      const captionContent = await response.text();
      console.log(`Fetched caption content: ${captionContent.length} characters on attempt ${attempt}`);

      // Enhanced parsing with memory management for longer videos
      return this.parseWebVTTWithEnhancedHandling(captionContent, videoId);

    } catch (error) {
      console.error(`Caption fetch error on attempt ${attempt}:`, error);
      throw new Error(`Caption error: ${error.message}`);
    }
  }

  private parseWebVTTWithEnhancedHandling(content: string, videoId: string): string | null {
    try {
      if (!content.includes('WEBVTT')) {
        console.warn('Content does not appear to be WebVTT format');
        return null;
      }

      const lines = content.split('\n');
      const segments: Array<{start: string, end: string, text: string}> = [];
      let currentSegment: any = null;
      let processedLines = 0;

      console.log(`Processing ${lines.length} lines for video ${videoId}`);

      for (const line of lines) {
        processedLines++;
        
        // Progress logging for very long videos
        if (processedLines % 1000 === 0) {
          console.log(`Processed ${processedLines}/${lines.length} lines...`);
        }

        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine === 'WEBVTT' || trimmedLine.startsWith('Kind:') || trimmedLine.startsWith('Language:')) {
          continue;
        }

        // Enhanced timestamp pattern matching
        const timestampPattern = /^(\d{1,2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3})/;
        const timestampMatch = trimmedLine.match(timestampPattern);

        if (timestampMatch) {
          // Save previous segment
          if (currentSegment?.text) {
            segments.push(currentSegment);
          }

          // Start new segment
          currentSegment = {
            start: timestampMatch[1],
            end: timestampMatch[2],
            text: ''
          };
        } else if (currentSegment && trimmedLine) {
          // Add text to current segment with enhanced cleaning
          const cleanedText = trimmedLine
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\[.*?\]/g, '') // Remove sound effects [music], [applause], etc.
            .trim();

          if (cleanedText) {
            currentSegment.text += (currentSegment.text ? ' ' : '') + cleanedText;
          }
        }
      }

      // Don't forget the last segment
      if (currentSegment?.text) {
        segments.push(currentSegment);
      }

      console.log(`✅ Parsed ${segments.length} segments for video ${videoId}`);

      if (segments.length === 0) {
        return null;
      }

      // Enhanced formatting with chunked processing for memory efficiency
      const chunkSize = 100;
      const formattedChunks: string[] = [];

      for (let i = 0; i < segments.length; i += chunkSize) {
        const chunk = segments.slice(i, i + chunkSize);
        const formattedChunk = chunk
          .map(segment => {
            const startTime = segment.start.substring(0, 8); // Remove milliseconds for readability
            const endTime = segment.end.substring(0, 8);
            return `[${startTime} - ${endTime}] ${segment.text}`;
          })
          .join('\n');
        
        formattedChunks.push(formattedChunk);
        
        // Log progress for very long videos
        if (formattedChunks.length % 10 === 0) {
          console.log(`Formatted ${i + chunk.length}/${segments.length} segments...`);
        }
      }

      const finalTranscript = formattedChunks.join('\n');
      console.log(`✅ Final transcript: ${finalTranscript.length} characters`);
      
      return finalTranscript;

    } catch (error) {
      console.error('Enhanced WebVTT parsing error:', error);
      return null;
    }
  }
}
