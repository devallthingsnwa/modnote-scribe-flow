
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

      // Try multiple methods to get audio
      const audioBuffer = await this.extractAudioWithFallbacks(videoId);
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
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', audioBlob, `${videoId}.webm`);
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

  private async extractAudioWithFallbacks(videoId: string): Promise<ArrayBuffer | null> {
    const methods = [
      () => this.tryYTDLPMethod(videoId),
      () => this.tryInnerTubeMethod(videoId),
      () => this.tryEmbedMethod(videoId),
      () => this.tryDirectStreamMethod(videoId)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Trying audio extraction method ${i + 1}/${methods.length}`);
        const result = await methods[i]();
        if (result) {
          console.log(`Audio extraction method ${i + 1} successful`);
          return result;
        }
      } catch (error) {
        console.warn(`Audio extraction method ${i + 1} failed:`, error.message);
      }
    }

    return null;
  }

  private async tryYTDLPMethod(videoId: string): Promise<ArrayBuffer | null> {
    try {
      // Use a YouTube audio extraction service that mimics yt-dlp behavior
      const extractorUrl = `https://www.yt-download.org/api/button/mp3/${videoId}`;
      
      const response = await fetch(extractorUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.yt-download.org/',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.url) {
          return await this.downloadAudio(data.url);
        }
      }
    } catch (error) {
      console.warn("YT-DLP method failed:", error);
    }
    return null;
  }

  private async tryInnerTubeMethod(videoId: string): Promise<ArrayBuffer | null> {
    try {
      // Try the modern YouTube InnerTube API approach
      const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20230101.00.00'
            }
          },
          videoId: videoId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const formats = data?.streamingData?.adaptiveFormats || [];
        
        // Find audio-only format
        const audioFormat = formats.find((format: any) => 
          format.mimeType?.includes('audio/webm') || format.mimeType?.includes('audio/mp4')
        );

        if (audioFormat?.url) {
          return await this.downloadAudio(audioFormat.url);
        }
      }
    } catch (error) {
      console.warn("InnerTube method failed:", error);
    }
    return null;
  }

  private async tryEmbedMethod(videoId: string): Promise<ArrayBuffer | null> {
    try {
      // Try extracting from the embed page
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      if (response.ok) {
        const html = await response.text();
        
        // Look for streaming data in the embed page
        const streamMatch = html.match(/"streamingData":\s*({[^}]+})/);
        if (streamMatch) {
          try {
            const streamData = JSON.parse(streamMatch[1]);
            const formats = streamData?.adaptiveFormats || [];
            
            const audioFormat = formats.find((format: any) => 
              format.mimeType?.includes('audio')
            );

            if (audioFormat?.url) {
              return await this.downloadAudio(audioFormat.url);
            }
          } catch (e) {
            console.warn("Failed to parse embed stream data:", e);
          }
        }
      }
    } catch (error) {
      console.warn("Embed method failed:", error);
    }
    return null;
  }

  private async tryDirectStreamMethod(videoId: string): Promise<ArrayBuffer | null> {
    try {
      // Try direct streaming URLs (these might work for some videos)
      const possibleUrls = [
        `https://www.youtube.com/watch?v=${videoId}&format=audio`,
        `https://r1---sn-4g5e6nls.googlevideo.com/videoplayback?id=${videoId}&itag=140`,
        `https://r2---sn-4g5e6nls.googlevideo.com/videoplayback?id=${videoId}&itag=140`
      ];

      for (const url of possibleUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Range': 'bytes=0-1048576' // Only download first 1MB to test
            }
          });

          if (response.ok && response.headers.get('content-type')?.includes('audio')) {
            // If we can get some audio content, download the full file
            return await this.downloadAudio(url);
          }
        } catch (e) {
          console.warn(`Direct stream URL failed: ${url}`, e);
        }
      }
    } catch (error) {
      console.warn("Direct stream method failed:", error);
    }
    return null;
  }

  private async downloadAudio(url: string): Promise<ArrayBuffer | null> {
    try {
      console.log("Downloading audio from URL...");
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/*,*/*;q=0.1',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      
      // Basic validation - ensure we have some audio-like content
      if (buffer.byteLength < 1000) {
        throw new Error('Downloaded content too small to be valid audio');
      }

      return buffer;
    } catch (error) {
      console.error("Error downloading audio:", error);
      return null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
