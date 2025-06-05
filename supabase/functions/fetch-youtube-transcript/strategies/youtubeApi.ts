
import { CaptionTrack, TranscriptStrategy } from './types.ts';

export class YouTubeApiStrategy implements TranscriptStrategy {
  name = 'youtube-api';

  async fetchTranscript(videoId: string): Promise<string> {
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    console.log(`🔍 YouTube API: Fetching captions for ${videoId}`);

    // Get video details and caption tracks
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );

    if (!videoResponse.ok) {
      throw new Error(`YouTube API error: ${videoResponse.status}`);
    }

    const videoData = await videoResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      throw new Error('Video not found via YouTube API');
    }

    // Get caption tracks
    const captionsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${apiKey}&part=snippet`
    );

    if (!captionsResponse.ok) {
      throw new Error(`Captions API error: ${captionsResponse.status}`);
    }

    const captionsData = await captionsResponse.json();
    
    if (!captionsData.items || captionsData.items.length === 0) {
      throw new Error('No captions available via API');
    }

    // Select the best caption track
    const bestTrack = this.selectBestCaptionTrack(captionsData.items);
    
    // Download caption content (requires OAuth for actual download)
    // For now, we'll fall back to direct API calls
    return await this.downloadCaptionContent(videoId, bestTrack);
  }

  private selectBestCaptionTrack(tracks: any[]): any {
    // Preference order: manual English > auto English > manual other > auto other
    return tracks.find(track => 
      track.snippet.language === 'en' && track.snippet.trackKind !== 'ASR'
    ) || tracks.find(track => 
      track.snippet.language === 'en'
    ) || tracks.find(track => 
      track.snippet.trackKind !== 'ASR'
    ) || tracks[0];
  }

  private async downloadCaptionContent(videoId: string, track: any): Promise<string> {
    // Since caption download requires OAuth, we'll use direct timedtext API
    const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${track.snippet.language}&fmt=srv3`;
    
    const response = await fetch(captionUrl);
    if (!response.ok) {
      throw new Error(`Failed to download captions: ${response.status}`);
    }

    return await response.text();
  }
}
