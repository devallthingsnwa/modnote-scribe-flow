
export interface TranscriptionConfig {
  provider: 'podsqueeze' | 'whisper' | 'riverside' | 'supadata';
  apiKey?: string;
  enabled: boolean;
  priority: number;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  metadata?: {
    title?: string;
    duration?: number;
    speaker_segments?: Array<{
      speaker: string;
      start: number;
      end: number;
      text: string;
    }>;
    credits?: number;
    availableLanguages?: string[];
    extractionMethod?: string;
    apiAttempt?: string;
    videoId?: string;
    isWarning?: boolean;
    audioQuality?: string;
    processingTime?: number;
    providersAttempted?: string;
  };
  error?: string;
  provider?: string;
}

export interface YouTubeMetadata {
  title?: string;
  thumbnail?: string;
  duration?: string;
  author?: string;
  description?: string;
}

export type MediaType = 'youtube' | 'podcast' | 'audio' | 'video' | 'unknown';
