
import { supabase } from "@/integrations/supabase/client";
import { AudioUtils } from "@/lib/speechToText/audioUtils";

export interface EnhancedTranscriptionOptions {
  enableSpeakerDetection?: boolean;
  addParagraphBreaks?: boolean;
  filterFillerWords?: boolean;
  noiseReduction?: boolean;
  language?: string;
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
}

export interface EnhancedTranscriptionResult {
  success: boolean;
  transcript: string;
  speakers?: SpeakerSegment[];
  metadata?: {
    speakerCount: number;
    processingTime: number;
    confidence: number;
    language: string;
  };
  error?: string;
}

export class EnhancedTranscriptionService {
  
  static async transcribeWithEnhancements(
    audioData: Blob | string, 
    options: EnhancedTranscriptionOptions = {}
  ): Promise<EnhancedTranscriptionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎙️ Starting enhanced transcription with speaker detection...');
      
      let base64Audio: string;
      
      if (audioData instanceof Blob) {
        base64Audio = await AudioUtils.convertBlobToBase64(audioData);
      } else {
        base64Audio = audioData;
      }

      // Call enhanced transcription edge function
      const { data, error } = await supabase.functions.invoke('enhanced-speech-transcription', {
        body: {
          audio: base64Audio,
          options: {
            enable_speaker_detection: options.enableSpeakerDetection ?? true,
            add_paragraph_breaks: options.addParagraphBreaks ?? true,
            filter_filler_words: options.filterFillerWords ?? true,
            noise_reduction: options.noiseReduction ?? true,
            language: options.language || 'auto'
          }
        }
      });

      if (error) {
        throw new Error(`Transcription failed: ${error.message}`);
      }

      const processingTime = Date.now() - startTime;

      if (data.success) {
        const formattedTranscript = this.formatTranscriptWithSpeakers(
          data.transcript, 
          data.speakers,
          options
        );

        return {
          success: true,
          transcript: formattedTranscript,
          speakers: data.speakers,
          metadata: {
            ...data.metadata,
            processingTime
          }
        };
      } else {
        throw new Error(data.error || 'Unknown transcription error');
      }

    } catch (error) {
      console.error('❌ Enhanced transcription failed:', error);
      return {
        success: false,
        error: error.message,
        transcript: '',
        metadata: {
          speakerCount: 0,
          processingTime: Date.now() - startTime,
          confidence: 0,
          language: 'unknown'
        }
      };
    }
  }

  static async transcribeVideoFile(
    videoFile: File,
    options: EnhancedTranscriptionOptions = {}
  ): Promise<EnhancedTranscriptionResult> {
    try {
      console.log('🎬 Processing video file for transcription...');
      
      // Extract audio from video file
      const audioBlob = await this.extractAudioFromVideo(videoFile);
      
      // Transcribe the extracted audio
      return await this.transcribeWithEnhancements(audioBlob, {
        ...options,
        enableSpeakerDetection: true // Always enable for video files
      });
      
    } catch (error) {
      console.error('❌ Video transcription failed:', error);
      return {
        success: false,
        error: error.message,
        transcript: ''
      };
    }
  }

  private static async extractAudioFromVideo(videoFile: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = new AudioContext();
      
      video.onloadedmetadata = () => {
        try {
          // Create audio context and extract audio
          const source = context.createMediaElementSource(video);
          const destination = context.createMediaStreamDestination();
          source.connect(destination);
          
          const mediaRecorder = new MediaRecorder(destination.stream);
          const chunks: BlobPart[] = [];
          
          mediaRecorder.ondataavailable = (event) => {
            chunks.push(event.data);
          };
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(chunks, { type: 'audio/wav' });
            resolve(audioBlob);
          };
          
          mediaRecorder.start();
          video.play();
          
          video.onended = () => {
            mediaRecorder.stop();
          };
          
        } catch (error) {
          reject(new Error(`Audio extraction failed: ${error.message}`));
        }
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video file'));
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  }

  private static formatTranscriptWithSpeakers(
    transcript: string, 
    speakers?: SpeakerSegment[],
    options: EnhancedTranscriptionOptions = {}
  ): string {
    if (!speakers || speakers.length === 0) {
      return this.formatTranscriptWithParagraphs(transcript, options);
    }

    let formattedTranscript = '';
    let currentSpeaker = '';
    
    speakers.forEach((segment, index) => {
      if (segment.speaker !== currentSpeaker) {
        if (formattedTranscript) formattedTranscript += '\n\n';
        formattedTranscript += `**${segment.speaker}:**\n`;
        currentSpeaker = segment.speaker;
      }
      
      formattedTranscript += segment.text;
      
      // Add paragraph break for long segments
      if (segment.text.length > 200 && index < speakers.length - 1) {
        formattedTranscript += '\n\n';
      } else if (index < speakers.length - 1) {
        formattedTranscript += ' ';
      }
    });

    return formattedTranscript;
  }

  private static formatTranscriptWithParagraphs(
    transcript: string,
    options: EnhancedTranscriptionOptions = {}
  ): string {
    if (!options.addParagraphBreaks) return transcript;

    // Add paragraph breaks at natural speech pauses
    return transcript
      .replace(/\.\s+/g, '.\n\n') // Break after sentences
      .replace(/\?\s+/g, '?\n\n') // Break after questions
      .replace(/!\s+/g, '!\n\n') // Break after exclamations
      .replace(/\n\n\n+/g, '\n\n'); // Normalize multiple breaks
  }
}
