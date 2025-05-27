import { ContentParser } from "./contentParser.ts";
import { YouTubeAPI } from "./youtubeApi.ts";
import { corsHeaders } from "./utils.ts";

export interface TranscriptOptions {
  language?: string;
  includeTimestamps?: boolean;
  format?: 'text' | 'json' | 'srt';
  maxRetries?: number;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  error?: string;
  metadata?: {
    videoId: string;
    language?: string;
    duration?: number;
    segmentCount?: number;
    extractionMethod: string;
  };
}

export class TranscriptExtractor {
  private contentParser: ContentParser;
  private youtubeAPI: YouTubeAPI;

  constructor() {
    this.contentParser = new ContentParser();
    this.youtubeAPI = new YouTubeAPI();
  }

  async extractTranscript(videoId: string, options: TranscriptOptions = {}): Promise<Response> {
    console.log(`Starting transcript extraction for video: ${videoId}`);

    // Try multiple extraction methods in order of preference
    const extractionMethods = [
      () => this.extractFromYouTubeAPI(videoId),
      () => this.extractFromVideoPage(videoId),
      () => this.extractFromCaptionTracks(videoId, options),
      () => this.extractFromAlternativeAPI(videoId),
      () => this.extractFromThirdPartyService(videoId),
      () => this.extractWithWhisperAI(videoId, options) // New AI fallback
    ];

    for (let i = 0; i < extractionMethods.length; i++) {
      try {
        console.log(`Attempting extraction method ${i + 1}`);
        const result = await extractionMethods[i]();
        
        if (result) {
          console.log(`Successfully extracted transcript using method ${i + 1}`);
          return result;
        }
      } catch (error) {
        console.warn(`Method ${i + 1} failed:`, error.message);
        continue;
      }
    }

    // If all methods fail, return a structured error response
    console.error("All transcript extraction methods failed");
    return new Response(
      JSON.stringify({
        success: false,
        transcript: "Unable to extract transcript from this video. The video may be private, restricted, or have audio processing limitations.",
        error: "All extraction methods failed including AI transcription",
        metadata: {
          videoId,
          segments: 0,
          duration: 0,
          extractionMethod: 'failed'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  private async extractWithWhisperAI(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting AI transcription with OpenAI Whisper");
      
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        console.warn("OpenAI API key not found, skipping Whisper transcription");
        return null;
      }

      // Get video audio URL using yt-dlp approach
      const audioUrl = await this.getVideoAudioUrl(videoId);
      if (!audioUrl) {
        console.warn("Could not extract audio URL for Whisper transcription");
        return null;
      }

      // Download audio (with size limit for safety)
      const audioResponse = await fetch(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      // Check file size (limit to ~25MB for Whisper API)
      const contentLength = audioResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
        console.warn("Audio file too large for Whisper API, skipping");
        return null;
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      
      // Prepare form data for Whisper API
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
      formData.append('file', audioBlob, `${videoId}.mp4`);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      // Call OpenAI Whisper API
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData
      });

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
      }

      const whisperResult = await whisperResponse.json();
      
      // Format the transcript with timestamps
      let formattedTranscript = '';
      if (whisperResult.segments && whisperResult.segments.length > 0) {
        formattedTranscript = whisperResult.segments
          .map((segment: any) => {
            const startTime = this.formatTime(segment.start || 0);
            const endTime = this.formatTime(segment.end || segment.start || 0);
            return `[${startTime} - ${endTime}] ${segment.text.trim()}`;
          })
          .join('\n');
      } else {
        // Fallback to plain text if no segments
        formattedTranscript = whisperResult.text || '';
      }

      console.log(`Whisper transcription successful: ${formattedTranscript.length} characters`);

      return new Response(
        JSON.stringify({
          success: true,
          transcript: formattedTranscript,
          metadata: {
            videoId,
            segments: whisperResult.segments?.length || 0,
            duration: whisperResult.segments?.slice(-1)[0]?.end || 0,
            extractionMethod: 'openai-whisper'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error("Whisper AI extraction failed:", error);
      return null;
    }
  }

  private async getVideoAudioUrl(videoId: string): Promise<string | null> {
    try {
      // Try to extract audio URL from YouTube's player response
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      // Extract player response data
      const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.*?});/);
      if (!playerResponseMatch) {
        return null;
      }

      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const formats = playerResponse?.streamingData?.adaptiveFormats || [];
      
      // Find audio-only format (prefer lower quality for faster processing)
      const audioFormat = formats.find((format: any) => 
        format.mimeType?.includes('audio') && 
        format.audioQuality === 'AUDIO_QUALITY_LOW'
      ) || formats.find((format: any) => format.mimeType?.includes('audio'));

      return audioFormat?.url || null;
    } catch (error) {
      console.error("Error extracting audio URL:", error);
      return null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private async extractFromYouTubeAPI(videoId: string): Promise<Response | null> {
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    if (apiKey) {
      return await this.youtubeAPI.fetchWithAPI(videoId, apiKey);
    }
    return null;
  }

  private async extractFromVideoPage(videoId: string): Promise<Response | null> {
    try {
      console.log("Attempting to extract from YouTube video page");
      
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract captions data from the page
      const captionsRegex = /"captions":(\{.*?\}),"videoDetails"/s;
      const match = html.match(captionsRegex);
      
      if (!match) {
        console.log("No captions data found in video page");
        return null;
      }

      const captionsData = JSON.parse(match[1]);
      const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!tracks || tracks.length === 0) {
        console.log("No caption tracks found");
        return null;
      }

      // Get the best available track (prefer auto-generated English)
      const preferredTrack = tracks.find((track: any) => 
        track.languageCode === 'en' || track.languageCode.startsWith('en')
      ) || tracks[0];

      if (!preferredTrack?.baseUrl) {
        console.log("No suitable caption track found");
        return null;
      }

      // Fetch the actual transcript content
      const transcriptResponse = await fetch(preferredTrack.baseUrl);
      const transcriptContent = await transcriptResponse.text();
      
      return await this.contentParser.processTranscriptContent(
        transcriptContent, 
        'youtube-page-extraction'
      );

    } catch (error) {
      console.error("Video page extraction failed:", error);
      return null;
    }
  }

  private async extractFromCaptionTracks(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting to extract from caption tracks API");
      
      // Try various caption API endpoints
      const apiEndpoints = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${options.language || 'en'}&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`
      ];
      
      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const content = await response.text();
            
            if (content.includes('<text')) {
              return await this.contentParser.processTranscriptContent(
                content, 
                'caption-tracks-api'
              );
            }
          }
        } catch (_) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Caption tracks extraction failed:", error);
      return null;
    }
  }

  private async extractFromAlternativeAPI(videoId: string): Promise<Response | null> {
    try {
      console.log("Attempting alternative API extraction");
      
      // Try alternative transcript API
      const response = await fetch(`https://youtube-transcript-api.herokuapp.com/transcript/${videoId}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        // Format the transcript
        const formattedTranscript = data
          .map((item: any) => {
            const startTime = this.contentParser.formatTime(item.start || 0);
            const endTime = this.contentParser.formatTime((item.start || 0) + (item.duration || 0));
            return `[${startTime} - ${endTime}] ${item.text || ''}`;
          })
          .join('\n');

        return new Response(
          JSON.stringify({
            success: true,
            transcript: formattedTranscript,
            metadata: {
              videoId,
              segments: data.length,
              duration: data[data.length - 1]?.start + data[data.length - 1]?.duration || 0,
              extractionMethod: 'alternative-api'
            }
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      return null;
    } catch (error) {
      console.error("Alternative API extraction failed:", error);
      return null;
    }
  }

  private async extractFromThirdPartyService(videoId: string): Promise<Response | null> {
    try {
      console.log("Attempting third-party service extraction");
      
      // Try a different approach using embed page
      const response = await fetch(`https://www.youtube.com/embed/${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      // Extract any available transcript data from embed page
      // This is a fallback method and may not always work
      const captionRegex = /"captionTracks":\[\{"baseUrl":"([^"]+)"/;
      const match = html.match(captionRegex);
      
      if (match && match[1]) {
        const captionUrl = match[1].replace(/\\u0026/g, '&');
        const transcriptResponse = await fetch(captionUrl);
        const transcriptContent = await transcriptResponse.text();
        
        return await this.contentParser.processTranscriptContent(
          transcriptContent,
          'embed-extraction'
        );
      }
      
      return null;
    } catch (error) {
      console.error("Third-party service extraction failed:", error);
      return null;
    }
  }
}
