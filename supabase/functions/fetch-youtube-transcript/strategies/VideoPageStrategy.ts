
import { corsHeaders, extractVideoId, validateVideoId } from '../utils.ts';

export class VideoPageStrategy {
  name = 'video-page';

  async fetchTranscript(videoId: string): Promise<string> {
    console.log(`🌐 VideoPage: Extracting from ${videoId}`);

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`📄 HTML length: ${html.length}`);

    // Enhanced patterns to find caption tracks
    const patterns = [
      /"captionTracks":\s*\[([^\]]+)\]/,
      /"captions":\s*\{[^}]*"playerCaptionsTracklistRenderer":\s*\{[^}]*"captionTracks":\s*\[([^\]]+)\]/,
      /var\s+ytInitialPlayerResponse\s*=\s*\{[^}]*"captions":[^}]*"captionTracks":\s*\[([^\]]+)\]/,
      /"playerMicroformatRenderer":[^}]*"captions":[^}]*"captionTracks":\s*\[([^\]]+)\]/,
      /"webPlayerActionsPorting":[^}]*"captions":[^}]*"captionTracks":\s*\[([^\]]+)\]/,
      /window\.ytplayer\.config\s*=\s*\{[^}]*"captions":[^}]*"captionTracks":\s*\[([^\]]+)\]/
    ];

    let captionTracks = null;

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          console.log(`📝 Found pattern match`);
          captionTracks = JSON.parse(`[${match[1]}]`);
          console.log(`✅ Parsed ${captionTracks.length} caption tracks`);
          break;
        } catch (e) {
          console.log(`❌ Failed to parse: ${e.message}`);
          continue;
        }
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('No caption tracks found in page HTML');
    }

    // Select best track (prefer manual over auto-generated, English first)
    const bestTrack = this.selectBestTrack(captionTracks);
    
    if (!bestTrack || !bestTrack.baseUrl) {
      throw new Error('No valid caption track found');
    }

    console.log(`🎯 Using track: ${bestTrack.languageCode || 'unknown'}`);
    
    const captionResponse = await fetch(bestTrack.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/xml,application/xml,*/*'
      }
    });

    if (!captionResponse.ok) {
      throw new Error(`Failed to download caption content: ${captionResponse.status}`);
    }

    const content = await captionResponse.text();
    console.log(`📄 Caption content length: ${content.length}`);
    
    if (!content.includes('<text') && !content.includes('WEBVTT')) {
      throw new Error('Invalid caption content format');
    }

    return content;
  }

  private selectBestTrack(tracks: any[]): any {
    // Preference order: manual English > auto English > manual Filipino > auto Filipino > manual other > auto other
    return tracks.find(track => 
      track.languageCode === 'en' && track.kind !== 'asr'
    ) || tracks.find(track => 
      track.languageCode === 'en'
    ) || tracks.find(track => 
      (track.languageCode === 'tl' || track.languageCode === 'fil') && track.kind !== 'asr'
    ) || tracks.find(track => 
      track.languageCode === 'tl' || track.languageCode === 'fil'
    ) || tracks.find(track => 
      track.kind !== 'asr'
    ) || tracks[0];
  }
}
