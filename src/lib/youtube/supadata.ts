import { supabase } from "@/integrations/supabase/client";
import { SupadataResponse } from "./types";

export class SupadataService {
  static async processWithEnhancedFallbackChain(videoId: string, retryAttempt: number = 0): Promise<SupadataResponse> {
    try {
      console.log(`🔗 Starting enhanced fallback chain for video: ${videoId} (attempt ${retryAttempt + 1})`);
      
      const { data, error } = await supabase.functions.invoke('supadata-transcript', {
        body: { 
          videoId,
          method: 'enhanced-fallback-chain',
          retryAttempt,
          options: {
            includeTimestamps: true,
            language: 'auto',
            maxRetries: 3,
            aggressiveMode: true,
            fallbackServices: ['podsqueeze', 'whisper', 'riverside']
          }
        }
      });

      if (error) {
        console.error("Enhanced fallback chain error:", error);
        throw new Error(error.message || 'Enhanced fallback chain service error');
      }

      if (data?.success) {
        console.log(`✅ Enhanced fallback chain successful via ${data.method}:`, data.transcript?.length || 0, "characters");
        return {
          success: true,
          transcript: data.transcript,
          segments: data.segments,
          processingTime: data.processingTime,
          method: data.method,
          metadata: data.metadata
        };
      }

      console.log("⚠️ Enhanced fallback chain completed but no transcript available");
      throw new Error(data?.error || 'All enhanced transcription methods failed');
      
    } catch (error) {
      console.error("❌ Enhanced fallback chain failed:", error);
      return {
        success: false,
        error: error.message || 'Enhanced fallback chain processing failed',
        retryable: error.retryable !== false
      };
    }
  }

  static async processWithFallbackChain(videoId: string, retryAttempt: number = 0): Promise<SupadataResponse> {
    return this.processWithEnhancedFallbackChain(videoId, retryAttempt);
  }

  static async fetchTranscript(videoId: string): Promise<SupadataResponse> {
    try {
      console.log(`🎯 Fetching transcript via Supadata for video: ${videoId}`);
      
      const { data, error } = await supabase.functions.invoke('supadata-transcript', {
        body: { 
          videoId,
          method: 'transcript',
          options: {
            includeTimestamps: true,
            language: 'auto'
          }
        }
      });

      if (error) {
        console.error("Supadata transcript error:", error);
        throw new Error(error.message || 'Supadata transcript service error');
      }

      if (data?.success && data?.transcript) {
        console.log("✅ Supadata transcript successful:", data.transcript.length, "characters");
        return {
          success: true,
          transcript: data.transcript,
          segments: data.segments,
          processingTime: data.processingTime
        };
      }

      console.log("⚠️ Supadata transcript API succeeded but no transcript available");
      return {
        success: false,
        error: data?.error || 'Captions unavailable',
        retryable: data?.retryable !== false,
        nextMethod: data?.nextMethod
      };
      
    } catch (error) {
      console.error("❌ Supadata transcript failed:", error);
      return {
        success: false,
        error: error.message || 'Supadata transcript extraction failed',
        retryable: true
      };
    }
  }

  static async transcribeAudio(videoId: string): Promise<SupadataResponse> {
    try {
      console.log(`🎵 Transcribing audio via Supadata for video: ${videoId}`);
      
      const { data, error } = await supabase.functions.invoke('supadata-transcript', {
        body: { 
          videoId,
          method: 'audio-transcription',
          options: {
            includeTimestamps: false,
            language: 'auto'
          }
        }
      });

      if (error) {
        console.error("Supadata audio transcription error:", error);
        throw new Error(error.message || 'Supadata audio transcription service error');
      }

      if (data?.success && data?.transcript) {
        console.log("✅ Supadata audio transcription successful:", data.transcript.length, "characters");
        return {
          success: true,
          transcript: data.transcript,
          processingTime: data.processingTime
        };
      }

      console.log("⚠️ Supadata audio transcription API succeeded but no transcript available");
      return {
        success: false,
        error: data?.error || 'Audio download failed',
        retryable: data?.retryable !== false,
        nextMethod: data?.nextMethod
      };
      
    } catch (error) {
      console.error("❌ Supadata audio transcription failed:", error);
      return {
        success: false,
        error: error.message || 'Supadata audio transcription failed',
        retryable: true
      };
    }
  }
}
