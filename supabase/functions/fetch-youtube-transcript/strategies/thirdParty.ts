
import { TranscriptStrategy } from './types.ts';

export class ThirdPartyStrategy implements TranscriptStrategy {
  name = 'third-party';

  async fetchTranscript(videoId: string): Promise<string> {
    console.log(`🔗 Third Party: Trying external services for ${videoId}`);

    // Try multiple third-party services
    const services = [
      () => this.tryYouTubeTranscriptAPI(videoId),
      () => this.tryAlternativeService(videoId),
      () => this.tryDirectTimedText(videoId)
    ];

    for (const service of services) {
      try {
        const result = await service();
        if (result) {
          return result;
        }
      } catch (error) {
        console.log(`❌ Service failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All third-party services failed');
  }

  private async tryYouTubeTranscriptAPI(videoId: string): Promise<string | null> {
    try {
      // Try youtube-transcript equivalent service
      const url = `https://youtubetranscript.com/?v=${videoId}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.transcript) {
          console.log(`✅ YouTube Transcript API success`);
          return data.transcript;
        }
      }
    } catch (error) {
      console.log(`YouTube Transcript API failed: ${error.message}`);
    }
    
    return null;
  }

  private async tryAlternativeService(videoId: string): Promise<string | null> {
    try {
      // Try alternative transcript service
      const url = `https://transcript-api.herokuapp.com/transcript?video_id=${videoId}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          console.log(`✅ Alternative service success`);
          return data.text;
        }
      }
    } catch (error) {
      console.log(`Alternative service failed: ${error.message}`);
    }
    
    return null;
  }

  private async tryDirectTimedText(videoId: string): Promise<string | null> {
    // Try direct timedtext API with various formats
    const urls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`,
      `https://video.google.com/timedtext?lang=en&v=${videoId}`
    ];

    for (const url of urls) {
      try {
        console.log(`🔗 Trying direct: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });

        if (response.ok) {
          const content = await response.text();
          if (content.includes('<text') && content.length > 100) {
            console.log(`✅ Direct timedtext success`);
            return content;
          }
        }
      } catch (error) {
        console.log(`Direct timedtext failed: ${error.message}`);
        continue;
      }
    }

    return null;
  }
}
