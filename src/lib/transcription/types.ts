
export interface TranscriptionConfig {
  provider: 'podsqueeze' | 'whisper' | 'riverside' | 'supadata';
  apiKey?: string;
  enabled: boolean;
  priority: number;
  timeout?: number;
  accuracyScore?: number;
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
    qualityScore?: string | number;
    transcriptionLength?: number;
    providerPriority?: number;
    capabilities?: string[];
    transcriptionSpeed?: string;
    extractionTimestamp?: string;
    alternativeResults?: number;
    errorType?: string;
    segmentCount?: number;
    metadataQuality?: string;
    extractedAt?: string;
    totalAttempts?: number;
    strategiesAttempted?: string;
    parallelProcessing?: boolean;
    timestamp?: string;
    provider?: string;
    fallbackType?: string;
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
  publishedAt?: string;
  viewCount?: string;
  tags?: string[];
  metadataQuality?: 'high' | 'basic' | 'minimal';
  extractedAt?: string;
}

export type MediaType = 'youtube' | 'podcast' | 'audio' | 'video' | 'unknown';
