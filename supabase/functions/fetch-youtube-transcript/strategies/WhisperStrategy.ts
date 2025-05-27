
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
}
