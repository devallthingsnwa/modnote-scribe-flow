
import { TranscriptResponse } from "../transcriptExtractor.ts";

export interface TranscriptOptions {
  language?: string;
  includeTimestamps?: boolean;
  format?: 'text' | 'json' | 'srt';
  maxRetries?: number;
}

export interface ITranscriptStrategy {
  extract(videoId: string, options?: TranscriptOptions): Promise<Response | null>;
  getName(): string;
}
