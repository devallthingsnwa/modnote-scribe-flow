
import { MediaType } from "./types";

export class MediaTypeDetector {
  static detectMediaType(url: string): MediaType {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('podcast') || url.includes('anchor.fm') || url.includes('spotify.com/episode')) {
      return 'podcast';
    }
    if (url.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      return 'audio';
    }
    if (url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return 'video';
    }
    return 'unknown';
  }
}
