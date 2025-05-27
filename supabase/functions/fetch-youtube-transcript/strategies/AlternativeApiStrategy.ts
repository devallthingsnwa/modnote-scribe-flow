
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class AlternativeApiStrategy implements ITranscriptStrategy {
  getName(): string {
    return 'alternative-api';
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
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
            const startTime = this.formatTime(item.start || 0);
            const endTime = this.formatTime((item.start || 0) + (item.duration || 0));
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

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
