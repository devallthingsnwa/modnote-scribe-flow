
import { YouTubeApiStrategy } from './youtubeApi.ts';
import { WebScrapingStrategy } from './webScraping.ts';
import { ThirdPartyStrategy } from './thirdParty.ts';
import { TranscriptStrategy, ProcessedTranscript, StrategyResult } from './types.ts';
import { ContentParser } from '../contentParser.ts';
import { extractVideoId, validateVideoId } from '../utils.ts';

export class TranscriptFetcher {
  private strategies: TranscriptStrategy[];
  private contentParser: ContentParser;

  constructor() {
    this.strategies = [
      new YouTubeApiStrategy(),
      new WebScrapingStrategy(),
      new ThirdPartyStrategy()
    ];
    this.contentParser = new ContentParser();
  }

  async getTranscript(videoUrl: string): Promise<ProcessedTranscript> {
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId || !validateVideoId(videoId)) {
      return {
        success: false,
        transcript: 'Invalid YouTube video URL or ID',
        metadata: {
          segments: 0,
          duration: 0,
          hasTimestamps: false,
          source: 'error',
          language: 'unknown',
          videoId: videoId || 'unknown',
          extractionMethod: 'none'
        },
        error: 'Invalid video ID'
      };
    }

    console.log(`🎯 Starting transcript extraction for: ${videoId}`);
    console.log(`🔗 Video URL: ${videoUrl}`);

    const results: StrategyResult[] = [];

    // Try each strategy in order
    for (const strategy of this.strategies) {
      try {
        console.log(`🔍 Trying strategy: ${strategy.name}`);
        
        const rawTranscript = await this.retryWithBackoff(
          () => strategy.fetchTranscript(videoId),
          3
        );

        if (rawTranscript && rawTranscript.length > 50) {
          console.log(`✅ Strategy ${strategy.name} successful`);
          
          // Process the transcript content
          const response = await this.contentParser.processTranscriptContent(
            rawTranscript, 
            strategy.name,
            { videoId, title: 'Unknown Video', author: 'Unknown Channel' }
          );

          if (response && response.ok) {
            const data = await response.json();
            return {
              success: true,
              transcript: data.transcript,
              metadata: {
                ...data.metadata,
                extractionMethod: strategy.name
              }
            };
          }
        }

        results.push({
          success: false,
          error: 'Content too short or invalid',
          strategy: strategy.name
        });

      } catch (error) {
        console.log(`❌ Strategy ${strategy.name} failed: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          strategy: strategy.name
        });
      }
    }

    // All strategies failed
    const errorSummary = results.map(r => `${r.strategy}: ${r.error}`).join('; ');
    
    return {
      success: false,
      transcript: `Unable to fetch transcript. Attempted methods: ${errorSummary}`,
      metadata: {
        segments: 0,
        duration: 0,
        hasTimestamps: false,
        source: 'error',
        language: 'unknown',
        videoId,
        extractionMethod: 'all-failed'
      },
      error: errorSummary
    };
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`⏳ Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Helper method to check video accessibility
  async validateVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  // Helper method to get video metadata
  async getVideoMetadata(videoId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title,
          author: data.author_name,
          thumbnail: data.thumbnail_url
        };
      }
    } catch (error) {
      console.log(`Failed to get video metadata: ${error.message}`);
    }
    
    return {
      title: 'Unknown Video',
      author: 'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  }
}

// Export strategy instances for individual use
export { YouTubeApiStrategy, WebScrapingStrategy, ThirdPartyStrategy };
export * from './types.ts';
