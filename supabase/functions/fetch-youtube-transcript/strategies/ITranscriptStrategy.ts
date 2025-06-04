
export interface TranscriptOptions {
  includeTimestamps?: boolean;
  language?: string;
  format?: 'text' | 'json' | 'srt';
  multipleStrategies?: boolean;
  extendedTimeout?: boolean;
  chunkProcessing?: boolean;
  retryCount?: number;
}

export interface ITranscriptStrategy {
  getName(): string;
  extract(videoId: string, options?: TranscriptOptions): Promise<Response | null>;
}
