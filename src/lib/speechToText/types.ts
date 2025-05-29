
export interface SpeechToTextResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
  provider?: string;
  metadata?: {
    duration?: number;
    language?: string;
    processingTime?: number;
  };
}

export interface TranscriptionOptions {
  language?: string;
  include_confidence?: boolean;
  include_timestamps?: boolean;
}
