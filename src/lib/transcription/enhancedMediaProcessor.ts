
import { supabase } from "@/integrations/supabase/client";
import { YouTubeService } from "./youtubeService";
import { MediaTypeDetector } from "./mediaTypeDetector";
import { TranscriptionResult, YouTubeMetadata } from "./types";

export interface MediaProcessingRequest {
  url: string;
  options?: {
    cleanTranscript?: boolean;
    includeTimestamps?: boolean;
    generateSummary?: boolean;
  };
}

export interface ProcessedMediaResult {
  success: boolean;
  title: string;
  content: string;
  source_url: string;
  thumbnail?: string;
  is_transcription: boolean;
  metadata?: YouTubeMetadata;
  error?: string;
}

export class EnhancedMediaProcessor {
  static async processMediaUrl(request: MediaProcessingRequest): Promise<ProcessedMediaResult> {
    const { url, options = {} } = request;
    const { cleanTranscript = true, includeTimestamps = false, generateSummary = false } = options;
    
    console.log(`🎯 Processing media URL: ${url}`);
    
    try {
      const mediaType = MediaTypeDetector.detectMediaType(url);
      console.log(`📊 Detected media type: ${mediaType}`);
      
      if (mediaType === 'youtube') {
        return await this.processYouTubeContent(url, { cleanTranscript, includeTimestamps, generateSummary });
      } else if (mediaType === 'podcast' || mediaType === 'audio') {
        return await this.processPodcastContent(url, { cleanTranscript, includeTimestamps, generateSummary });
      } else {
        return await this.processGeneralMediaContent(url, { cleanTranscript, includeTimestamps, generateSummary });
      }
    } catch (error) {
      console.error('❌ Media processing failed:', error);
      return {
        success: false,
        title: this.extractTitleFromUrl(url),
        content: this.createFallbackContent(url, error.message),
        source_url: url,
        is_transcription: false,
        error: error.message
      };
    }
  }

  private static async processYouTubeContent(
    url: string, 
    options: { cleanTranscript: boolean; includeTimestamps: boolean; generateSummary: boolean }
  ): Promise<ProcessedMediaResult> {
    console.log('🎥 Processing YouTube content...');
    
    const videoId = YouTubeService.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }

    // Fetch metadata and transcript in parallel
    const [metadata, transcriptResult] = await Promise.allSettled([
      YouTubeService.getYouTubeMetadata(videoId),
      YouTubeService.fetchYouTubeTranscript(url)
    ]);

    let videoMetadata: YouTubeMetadata = {
      title: `YouTube Video ${videoId}`,
      author: 'Unknown',
      duration: 'Unknown'
    };

    if (metadata.status === 'fulfilled') {
      videoMetadata = metadata.value;
    }

    let transcript = '';
    let isTranscription = false;

    if (transcriptResult.status === 'fulfilled' && transcriptResult.value.success) {
      transcript = transcriptResult.value.text || '';
      isTranscription = transcript.length > 100;
      
      if (options.cleanTranscript && isTranscription) {
        transcript = this.cleanTranscriptContent(transcript);
      }
    }

    const formattedContent = this.formatMediaContent({
      title: videoMetadata.title,
      url,
      transcript: transcript || 'Transcript could not be extracted for this video.',
      metadata: videoMetadata,
      mediaType: 'Video',
      isTranscription
    });

    return {
      success: true,
      title: videoMetadata.title,
      content: formattedContent,
      source_url: url,
      thumbnail: videoMetadata.thumbnail,
      is_transcription: isTranscription,
      metadata: videoMetadata
    };
  }

  private static async processPodcastContent(
    url: string, 
    options: { cleanTranscript: boolean; includeTimestamps: boolean; generateSummary: boolean }
  ): Promise<ProcessedMediaResult> {
    console.log('🎙️ Processing podcast content...');
    
    try {
      // Use external providers for podcast transcription
      const { data, error } = await supabase.functions.invoke('multimedia-transcription', {
        body: { 
          url,
          type: 'podcast',
          options: {
            include_metadata: true,
            include_timestamps: options.includeTimestamps,
            clean_audio: true,
            filter_noise: true
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Podcast transcription failed');
      }

      let transcript = data?.transcript || '';
      let title = data?.metadata?.title || this.extractTitleFromUrl(url);
      
      if (options.cleanTranscript && transcript) {
        transcript = this.cleanTranscriptContent(transcript);
      }

      const isTranscription = transcript.length > 100;
      
      const formattedContent = this.formatMediaContent({
        title,
        url,
        transcript: transcript || 'Transcript could not be extracted for this podcast.',
        metadata: data?.metadata || {},
        mediaType: 'Podcast',
        isTranscription
      });

      return {
        success: true,
        title,
        content: formattedContent,
        source_url: url,
        is_transcription: isTranscription,
        metadata: data?.metadata
      };
    } catch (error) {
      console.error('❌ Podcast processing failed:', error);
      
      const title = this.extractTitleFromUrl(url);
      return {
        success: true,
        title,
        content: this.createFallbackContent(url, error.message, 'Podcast'),
        source_url: url,
        is_transcription: false,
        error: error.message
      };
    }
  }

  private static async processGeneralMediaContent(
    url: string, 
    options: { cleanTranscript: boolean; includeTimestamps: boolean; generateSummary: boolean }
  ): Promise<ProcessedMediaResult> {
    console.log('🌐 Processing general media content...');
    
    try {
      const { data, error } = await supabase.functions.invoke('multimedia-transcription', {
        body: { 
          url,
          type: 'general',
          options: {
            include_metadata: true,
            include_timestamps: options.includeTimestamps,
            clean_audio: true
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Media transcription failed');
      }

      let transcript = data?.transcript || '';
      let title = data?.metadata?.title || this.extractTitleFromUrl(url);
      
      if (options.cleanTranscript && transcript) {
        transcript = this.cleanTranscriptContent(transcript);
      }

      const isTranscription = transcript.length > 100;
      
      const formattedContent = this.formatMediaContent({
        title,
        url,
        transcript: transcript || 'Transcript could not be extracted for this media.',
        metadata: data?.metadata || {},
        mediaType: 'Media',
        isTranscription
      });

      return {
        success: true,
        title,
        content: formattedContent,
        source_url: url,
        is_transcription: isTranscription,
        metadata: data?.metadata
      };
    } catch (error) {
      console.error('❌ General media processing failed:', error);
      
      const title = this.extractTitleFromUrl(url);
      return {
        success: true,
        title,
        content: this.createFallbackContent(url, error.message, 'Media'),
        source_url: url,
        is_transcription: false,
        error: error.message
      };
    }
  }

  private static cleanTranscriptContent(transcript: string): string {
    console.log('🧹 Cleaning transcript content...');
    
    let cleaned = transcript;
    
    // Remove common noise indicators and background sounds
    const noisePatterns = [
      /\[background music\]/gi,
      /\[music\]/gi,
      /\[applause\]/gi,
      /\[laughter\]/gi,
      /\[inaudible\]/gi,
      /\[noise\]/gi,
      /\[static\]/gi,
      /\[beep\]/gi,
      /\[sound effect\]/gi,
      /\[background noise\]/gi,
      /\(background music\)/gi,
      /\(music\)/gi,
      /\(applause\)/gi,
      /\(laughter\)/gi,
      /\(inaudible\)/gi,
      /\(noise\)/gi,
      /\*background music\*/gi,
      /\*music\*/gi,
      /\*applause\*/gi,
      /\*laughter\*/gi
    ];

    // Remove noise patterns
    noisePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove excessive whitespace and clean up
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper spacing after sentences
      .replace(/\s+([.!?])/g, '$1') // Remove space before punctuation
      .trim();

    // Ensure proper paragraph breaks
    cleaned = cleaned
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');

    console.log(`✅ Transcript cleaned: ${cleaned.length} characters`);
    return cleaned;
  }

  private static formatMediaContent(params: {
    title: string;
    url: string;
    transcript: string;
    metadata: any;
    mediaType: string;
    isTranscription: boolean;
  }): string {
    const { title, url, transcript, metadata, mediaType, isTranscription } = params;
    
    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let content = `# 🎥 ${title}\n\n`;
    content += `**Source:** ${url}\n`;
    content += `**Type:** ${mediaType}${isTranscription ? ' Transcript' : ' Note'}\n`;
    content += `**Imported:** ${currentDate}\n`;
    
    if (metadata.author) {
      content += `**Author:** ${metadata.author}\n`;
    }
    if (metadata.duration) {
      content += `**Duration:** ${metadata.duration}\n`;
    }
    
    content += `\n---\n\n`;
    content += `## 📝 Transcript\n\n`;
    content += `${transcript}\n\n`;
    content += `---\n\n`;
    content += `## 📝 My Notes\n\n`;
    content += `Add your personal notes and thoughts here...\n`;

    return content;
  }

  private static createFallbackContent(url: string, error: string, mediaType: string = 'Media'): string {
    const title = this.extractTitleFromUrl(url);
    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let content = `# 🎥 ${title}\n\n`;
    content += `**Source:** ${url}\n`;
    content += `**Type:** ${mediaType} Note\n`;
    content += `**Imported:** ${currentDate}\n`;
    content += `**Status:** ⚠️ Transcript unavailable\n\n`;
    content += `---\n\n`;
    content += `## 📝 Transcript\n\n`;
    content += `Automatic transcript extraction was not successful. This may be because:\n`;
    content += `- The ${mediaType.toLowerCase()} doesn't have captions available\n`;
    content += `- The content is private or restricted\n`;
    content += `- The audio quality is too poor for transcription\n`;
    content += `- The content contains primarily music or non-speech audio\n\n`;
    content += `You can still use this note to:\n`;
    content += `1. Add your own observations and notes\n`;
    content += `2. Summarize key points manually\n`;
    content += `3. Add timestamps for important moments\n\n`;
    content += `---\n\n`;
    content += `## 📝 My Notes\n\n`;
    content += `Add your personal notes and observations here...\n`;

    return content;
  }

  private static extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      let title = urlObj.hostname;
      
      // Extract better titles for common platforms
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = YouTubeService.extractVideoId(url);
        title = videoId ? `YouTube Video ${videoId}` : 'YouTube Video';
      } else if (url.includes('spotify.com')) {
        title = 'Spotify Content';
      } else if (url.includes('soundcloud.com')) {
        title = 'SoundCloud Content';
      } else if (url.includes('anchor.fm')) {
        title = 'Anchor Podcast';
      } else {
        title = `${title} Content`;
      }
      
      return title;
    } catch {
      return 'Media Content';
    }
  }

  static async saveToDatabase(result: ProcessedMediaResult, userId: string): Promise<{ success: boolean; noteId?: string; error?: string }> {
    try {
      console.log('💾 Saving processed media to database...');
      
      const noteData = {
        user_id: userId,
        title: result.title,
        content: result.content,
        source_url: result.source_url,
        thumbnail: result.thumbnail,
        is_transcription: result.is_transcription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedNote, error: insertError } = await supabase
        .from('notes')
        .insert([noteData])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Database save failed: ${insertError.message}`);
      }

      console.log('✅ Media content saved to database:', insertedNote.id);
      return { success: true, noteId: insertedNote.id };
    } catch (error) {
      console.error('❌ Database save failed:', error);
      return { success: false, error: error.message };
    }
  }
}
