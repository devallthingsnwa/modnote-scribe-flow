
import { MediaType } from './types';

export class MediaTypeDetector {
  static detectMediaType(url: string): MediaType {
    // Check if it's a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    
    // Check for podcast/audio URLs
    if (url.includes('podcast') || url.includes('audio') || 
        url.match(/\.(mp3|wav|m4a|aac|ogg)(\?|$)/i)) {
      return 'podcast';
    }
    
    // Check for video URLs
    if (url.match(/\.(mp4|avi|mov|mkv|webm)(\?|$)/i)) {
      return 'video';
    }
    
    // Check for audio streaming services
    if (url.includes('spotify.com') || url.includes('soundcloud.com') || 
        url.includes('anchor.fm') || url.includes('libsyn.com')) {
      return 'podcast';
    }
    
    return 'unknown';
  }
}
