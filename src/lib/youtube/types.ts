
export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  description?: string;
  method?: string;
  reason?: string;
}

export interface TranscriptResult {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  metadata?: VideoMetadata;
  source: 'captions' | 'audio-transcription' | 'external' | 'fallback';
  error?: string;
  retryable?: boolean;
  nextMethod?: string;
  method?: string;
}

export interface SupadataResponse {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  error?: string;
  processingTime?: number;
  retryable?: boolean;
  nextMethod?: string;
  method?: string;
  metadata?: VideoMetadata;
}
