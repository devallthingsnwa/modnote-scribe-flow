import { SupadataStrategy } from "./strategies/SupadataStrategy.ts";
import { FallbackMethods } from "./fallbackMethods.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptOptions {
  includeTimestamps?: boolean;
  language?: string;
  format?: 'text' | 'json' | 'srt' | 'raw';
  extendedTimeout?: boolean;
  retryCount?: number;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript: string;
  segments?: TranscriptSegment[];
  metadata?: {
    videoId: string;
    title?: string;
    author?: string;
    language?: string;
    duration?: number;
    segmentCount?: number;
    extractionMethod: string;
    provider?: string;
    quality?: string;
  };
  error?: string;
}

export class TranscriptExtractor {
  
  async extractTranscriptWithExtendedHandling(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    const timeout = options.extendedTimeout ? 120000 : 60000;
    const maxAttempts = 3;
    
    console.log(`Enhanced extraction for ${videoId} with extended timeout (${timeout}ms)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Enhanced attempt ${attempt}/${maxAttempts} for video ${videoId}`);
        
        const result = await this.extractWithTimeout(videoId, options, timeout);
        if (result) {
          return result;
        }
        
        if (attempt < maxAttempts) {
          const delay = attempt * 2000;
          console.log(`Waiting ${delay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Enhanced parsing error on attempt ${attempt}:`, error);
        
        if (attempt === maxAttempts) {
          return this.createEnhancedFallbackResponse(videoId, error.message);
        }
      }
    }
    
    return this.createEnhancedFallbackResponse(videoId, "All extraction attempts failed");
  }
  
  private async extractWithTimeout(videoId: string, options: TranscriptOptions, timeout: number): Promise<Response | null> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`Extraction timeout after ${timeout}ms`);
        resolve(null);
      }, timeout);
      
      try {
        const result = await this.tryAllExtractionMethods(videoId, options);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Extraction error:", error);
        resolve(null);
      }
    });
  }
  
  private async tryAllExtractionMethods(videoId: string, options: TranscriptOptions): Promise<Response | null> {
    console.log("Trying all extraction methods in sequence...");
    
    // Strategy 1: Supadata API (if available)
    try {
      console.log("Attempting Supadata API extraction...");
      const supadataStrategy = new SupadataStrategy();
      const supadataResult = await supadataStrategy.extract(videoId, options);
      
      if (supadataResult) {
        console.log("Supadata API extraction successful");
        return this.formatTranscriptResponse(supadataResult, videoId, options);
      }
    } catch (error) {
      console.warn("Supadata API extraction failed:", error);
    }
    
    // Strategy 2: Enhanced fallback methods
    try {
      console.log("Attempting enhanced fallback methods...");
      const fallbackMethods = new FallbackMethods();
      const fallbackResult = await fallbackMethods.tryAllMethods(videoId, options);
      
      if (fallbackResult) {
        console.log("Fallback methods extraction successful");
        return this.formatTranscriptResponse(fallbackResult, videoId, options);
      }
    } catch (error) {
      console.warn("Fallback methods extraction failed:", error);
    }
    
    // Strategy 3: Final fallback with structured response
    console.log("Creating structured fallback response...");
    return this.createStructuredFallbackResponse(videoId, options);
  }

  private async formatTranscriptResponse(response: Response, videoId: string, options: TranscriptOptions): Promise<Response> {
    try {
      const data = await response.json();
      
      if (data.success && data.transcript) {
        // Get video metadata
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        let videoTitle = `YouTube Video ${videoId}`;
        
        try {
          const oembedResponse = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
          );
          if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json();
            videoTitle = oembedData.title || videoTitle;
          }
        } catch (error) {
          console.warn("Failed to fetch video metadata:", error);
        }

        // Format transcript based on requested format
        const formattedTranscript = this.formatTranscriptContent(data.transcript, videoTitle, videoUrl, options.format || 'text');
        
        const transcriptResponse: TranscriptResponse = {
          success: true,
          transcript: formattedTranscript,
          metadata: {
            ...data.metadata,
            videoId,
            title: videoTitle,
            extractionMethod: data.metadata?.extractionMethod || 'api-extraction'
          }
        };

        return new Response(
          JSON.stringify(transcriptResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return response;
    } catch (error) {
      console.error("Error formatting transcript response:", error);
      return response;
    }
  }

  private formatTranscriptContent(transcript: string, title: string, videoUrl: string, format: string = 'text'): string {
    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // If raw format is requested, extract only the text content
    if (format === 'raw') {
      let rawTranscript = transcript;
      
      // Remove timestamps and formatting, keep only the spoken text
      rawTranscript = rawTranscript
        .replace(/\[\d{2}:\d{2}(?:\.\d{3})?\s*-?\s*\d{2}:\d{2}(?:\.\d{3})?\]/g, '') // Remove timestamps
        .replace(/\n\s*\n/g, ' ') // Replace line breaks with spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/[,]\s*/g, ', ') // Normalize commas
        .trim();

      let formattedContent = `# 🎥 "${title}"\n\n`;
      formattedContent += `**Source:** ${videoUrl}\n`;
      formattedContent += `**Type:** Video Transcript\n`;
      formattedContent += `**Imported:** ${currentDate}\n\n`;
      formattedContent += `---\n\n`;
      formattedContent += `## 📝 Transcript\n\n`;
      formattedContent += `${rawTranscript}\n\n`;
      formattedContent += `---\n\n`;
      formattedContent += `## 📝 My Notes\n\n`;
      formattedContent += `Add your personal notes and thoughts here...\n`;

      return formattedContent;
    }

    // Default structured format
    let cleanTranscript = transcript;
    
    // Remove any existing markdown formatting that might interfere
    cleanTranscript = cleanTranscript.replace(/^#+\s*.*$/gm, ''); // Remove existing headers
    cleanTranscript = cleanTranscript.replace(/^\*\*.*\*\*$/gm, ''); // Remove bold metadata lines
    cleanTranscript = cleanTranscript.replace(/^---+$/gm, ''); // Remove separators
    cleanTranscript = cleanTranscript.replace(/^##\s*.*$/gm, ''); // Remove section headers
    cleanTranscript = cleanTranscript.trim();

    let formattedContent = `# 🎥 "${title}"\n\n`;
    formattedContent += `**Source:** ${videoUrl}\n`;
    formattedContent += `**Type:** Video Transcript\n`;
    formattedContent += `**Imported:** ${currentDate}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 Transcript\n\n`;
    formattedContent += `${cleanTranscript}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 My Notes\n\n`;
    formattedContent += `Add your personal notes and thoughts here...\n`;

    return formattedContent;
  }
  
  private createStructuredFallbackResponse(videoId: string, options: TranscriptOptions): Response {
    console.log("Creating structured fallback response for video:", videoId);
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const fallbackTitle = `YouTube Video ${videoId}`;
    
    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let fallbackTranscript = `# 🎥 "${fallbackTitle}"\n\n`;
    fallbackTranscript += `**Source:** ${videoUrl}\n`;
    fallbackTranscript += `**Type:** Video Note\n`;
    fallbackTranscript += `**Imported:** ${currentDate}\n`;
    fallbackTranscript += `**Status:** ⚠️ Transcript unavailable\n\n`;
    fallbackTranscript += `---\n\n`;
    fallbackTranscript += `## 📝 Transcript\n\n`;
    fallbackTranscript += `This video's transcript could not be automatically extracted. This may be because:\n`;
    fallbackTranscript += `- The video doesn't have captions available\n`;
    fallbackTranscript += `- The video is private or restricted\n`;
    fallbackTranscript += `- Captions are disabled by the creator\n`;
    fallbackTranscript += `- The video is a live stream\n\n`;
    fallbackTranscript += `You can:\n`;
    fallbackTranscript += `1. Visit the video directly to check for captions\n`;
    fallbackTranscript += `2. Add your own notes about this video below\n`;
    fallbackTranscript += `3. Try again later as captions may become available\n\n`;
    fallbackTranscript += `---\n\n`;
    fallbackTranscript += `## 📝 My Notes\n\n`;
    fallbackTranscript += `Add your personal notes and observations about this video here:\n\n`;
    fallbackTranscript += `### Key Points\n`;
    fallbackTranscript += `- \n\n`;
    fallbackTranscript += `### Timestamps & Moments\n`;
    fallbackTranscript += `- 00:00 - \n`;
    fallbackTranscript += `- \n\n`;
    fallbackTranscript += `### Summary\n\n`;

    const transcriptResponse: TranscriptResponse = {
      success: true,
      transcript: fallbackTranscript,
      metadata: {
        videoId,
        title: fallbackTitle,
        author: 'Unknown',
        language: options.language || 'en',
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'structured-fallback',
        provider: 'fallback-system',
        quality: 'template'
      }
    };

    return new Response(
      JSON.stringify(transcriptResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  private createEnhancedFallbackResponse(videoId: string, error: string): Response {
    console.log("Creating enhanced fallback response due to error:", error);
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const fallbackTranscript = `# 🎥 "YouTube Video ${videoId}"\n\n**Source:** ${videoUrl}\n**Type:** Video Note\n**Imported:** ${currentDate}\n**Status:** ⚠️ Transcript extraction failed\n**Error:** ${error}\n\n---\n\n## 📝 Transcript\n\nAutomatic transcript extraction was not successful. You can manually add your notes and observations about this video below.\n\n---\n\n## 📝 My Notes\n\nAdd your content here...`;

    const transcriptResponse: TranscriptResponse = {
      success: true,
      transcript: fallbackTranscript,
      metadata: {
        videoId,
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        language: 'en',
        duration: 0,
        segmentCount: 0,
        extractionMethod: 'error-fallback',
        provider: 'fallback-system',
        quality: 'basic'
      },
      error: error
    };

    return new Response(
      JSON.stringify(transcriptResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
