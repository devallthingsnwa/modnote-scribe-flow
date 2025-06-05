
import { corsHeaders } from '../utils.ts';

export class WhisperStrategy {
  name = 'whisper-ai';

  async fetchTranscript(videoId: string): Promise<string> {
    console.log(`🤖 Whisper: AI transcription for ${videoId}`);
    
    // This is a placeholder for AI transcription
    // Would require downloading video audio and processing with Whisper
    throw new Error('Whisper AI transcription not implemented - use only for audio files');
  }
}
