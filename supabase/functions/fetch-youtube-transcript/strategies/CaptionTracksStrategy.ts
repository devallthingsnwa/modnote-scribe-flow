
import { corsHeaders, extractVideoId, validateVideoId } from '../utils.ts';

export class CaptionTracksStrategy {
  name = 'caption-tracks';

  async fetchTranscript(videoId: string): Promise<string> {
    console.log(`🔍 CaptionTracks: Fetching captions for ${videoId}`);

    // Enhanced list of caption URL formats to try
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=tl&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=fil&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv1`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3&kind=asr`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3&auto=1`
    ];

    for (const url of captionUrls) {
      try {
        console.log(`🔗 Testing: ${url.substring(0, 80)}...`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,*/*;q=0.5',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });

        console.log(`📊 Status: ${response.status}`);
        
        if (response.ok) {
          const content = await response.text();
          console.log(`📄 Content length: ${content.length}`);
          
          if (content.includes('<text') && content.length > 100) {
            console.log(`✅ Found valid XML captions`);
            return content;
          }
        }
      } catch (error) {
        console.log(`❌ URL failed: ${error.message}`);
      }
    }

    throw new Error('No captions found via direct caption API');
  }
}
