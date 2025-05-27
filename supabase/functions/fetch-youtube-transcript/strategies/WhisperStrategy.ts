
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class WhisperStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'openai-whisper';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    try {
      console.log("Attempting AI transcription with OpenAI Whisper");
      
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        console.warn("OpenAI API key not found, skipping Whisper transcription");
        return null;
      }

      // Try to get audio using yt-dlp style extraction
      const audioBuffer = await this.extractAudio(videoId);
      if (!audioBuffer) {
        console.warn("Could not extract audio for Whisper transcription");
        return null;
      }

      console.log(`Audio extracted successfully, size: ${audioBuffer.byteLength} bytes`);

      // Check file size (limit to ~25MB for Whisper API)
      if (audioBuffer.byteLength > 25 * 1024 * 1024) {
        console.warn("Audio file too large for Whisper API, skipping");
        return null;
      }

      // Prepare form data for Whisper API
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
      formData.append('file', audioBlob, `${videoId}.mp4`);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      console.log("Sending audio to OpenAI Whisper API...");

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

  private async extractAudio(videoId: string): Promise<ArrayBuffer | null> {
    try {
      // Use multiple approaches to get audio
      const audioUrl = await this.getAudioUrl(videoId);
      if (!audioUrl) {
        console.warn("Could not find audio URL");
        return null;
      }

      console.log("Downloading audio from extracted URL...");
      
      // Download the audio with proper headers
      const audioResponse = await fetch(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'audio/webm,audio/ogg,audio/*,*/*;q=0.1',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
          'Origin': 'https://www.youtube.com',
        }
      });

      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      return await audioResponse.arrayBuffer();
    } catch (error) {
      console.error("Error extracting audio:", error);
      return null;
    }
  }

  private async getAudioUrl(videoId: string): Promise<string | null> {
    try {
      // First, try to get the video page
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video page: ${response.status}`);
      }

      const html = await response.text();
      
      // Try to extract player response data
      const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.*?});/);
      if (playerResponseMatch) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          const formats = playerResponse?.streamingData?.adaptiveFormats || [];
          
          // Find audio-only format (prefer medium quality for balance)
          const audioFormat = formats.find((format: any) => 
            format.mimeType?.includes('audio') && 
            (format.audioQuality === 'AUDIO_QUALITY_MEDIUM' || format.audioQuality === 'AUDIO_QUALITY_LOW')
          ) || formats.find((format: any) => format.mimeType?.includes('audio'));

          if (audioFormat?.url) {
            return audioFormat.url;
          }
        } catch (e) {
          console.warn("Failed to parse player response:", e);
        }
      }

      // Fallback: try to extract from config data
      const configMatch = html.match(/ytplayer\.config\s*=\s*({.*?});/);
      if (configMatch) {
        try {
          const config = JSON.parse(configMatch[1]);
          const streamMap = config?.args?.adaptive_fmts;
          if (streamMap) {
            const formats = streamMap.split(',').map((format: string) => {
              const params = new URLSearchParams(format);
              return {
                url: params.get('url'),
                type: params.get('type'),
                quality: params.get('quality')
              };
            });
            
            const audioFormat = formats.find((format: any) => 
              format.type?.includes('audio')
            );
            
            if (audioFormat?.url) {
              return audioFormat.url;
            }
          }
        } catch (e) {
          console.warn("Failed to parse config data:", e);
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting audio URL:", error);
      return null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
