
import { supabase } from "@/integrations/supabase/client";

export interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface EnhancedTranscriptionResult {
  success: boolean;
  text: string;
  speakers?: SpeakerSegment[];
  metadata?: {
    duration: number;
    speakerCount: number;
    processingTime: number;
    audioQuality: string;
    language: string;
  };
  error?: string;
}

export class EnhancedTranscriptionService {
  static async transcribeVideoFile(file: File): Promise<EnhancedTranscriptionResult> {
    try {
      console.log(`🎬 Starting enhanced video transcription for: ${file.name}`);
      
      // Convert file to base64 for processing
      const base64Audio = await this.convertFileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('enhanced-speech-transcription', {
        body: {
          audioData: base64Audio,
          fileName: file.name,
          options: {
            enableSpeakerDetection: true,
            enableNoiseReduction: true,
            filterFillerWords: true,
            addParagraphBreaks: true,
            language: 'auto'
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Video transcription failed');
      }

      if (data?.success) {
        return {
          success: true,
          text: data.transcript,
          speakers: data.speakers,
          metadata: data.metadata
        };
      } else {
        throw new Error(data?.error || 'No transcription data received');
      }
    } catch (error) {
      console.error('Enhanced video transcription failed:', error);
      return {
        success: false,
        text: '',
        error: error.message || 'Video transcription failed'
      };
    }
  }

  static async transcribeYouTubeWithSpeakers(videoId: string): Promise<EnhancedTranscriptionResult> {
    try {
      console.log(`🎥 Starting YouTube transcription with speaker detection: ${videoId}`);
      
      const { data, error } = await supabase.functions.invoke('enhanced-youtube-processor', {
        body: {
          videoId,
          options: {
            enableSpeakerDetection: true,
            enableNoiseReduction: true,
            filterFillerWords: true,
            addParagraphBreaks: true,
            extractAudio: true,
            language: 'auto'
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'YouTube transcription failed');
      }

      if (data?.success) {
        return {
          success: true,
          text: data.transcript,
          speakers: data.speakers,
          metadata: data.metadata
        };
      } else {
        throw new Error(data?.error || 'No transcription data received');
      }
    } catch (error) {
      console.error('Enhanced YouTube transcription failed:', error);
      return {
        success: false,
        text: '',
        error: error.message || 'YouTube transcription failed'
      };
    }
  }

  private static async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static formatTranscriptWithSpeakers(speakers: SpeakerSegment[]): string {
    let formattedText = '';
    let currentSpeaker = '';
    let currentParagraph = '';

    for (const segment of speakers) {
      if (segment.speaker !== currentSpeaker) {
        // End current paragraph and start new speaker section
        if (currentParagraph.trim()) {
          formattedText += currentParagraph.trim() + '\n\n';
        }
        formattedText += `**${segment.speaker}:** `;
        currentSpeaker = segment.speaker;
        currentParagraph = segment.text + ' ';
      } else {
        currentParagraph += segment.text + ' ';
      }

      // Add paragraph break for long speeches
      if (currentParagraph.length > 500) {
        formattedText += currentParagraph.trim() + '\n\n';
        formattedText += `**${segment.speaker}:** `;
        currentParagraph = '';
      }
    }

    // Add final paragraph
    if (currentParagraph.trim()) {
      formattedText += currentParagraph.trim();
    }

    return formattedText;
  }

  static cleanTranscriptText(text: string): string {
    // Remove common filler words
    const fillerWords = /\b(um|uh|er|ah|like|you know|sort of|kind of)\b/gi;
    
    // Clean up multiple spaces and normalize punctuation
    return text
      .replace(fillerWords, '')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([a-z])/g, '$1 $2')
      .trim();
  }
}
