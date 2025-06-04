
import { ITranscriptStrategy, TranscriptOptions } from "./ITranscriptStrategy.ts";
import { corsHeaders } from "../utils.ts";

export class SupadataStrategy implements ITranscriptStrategy {
  getName(): string {
    return "supadata-api";
  }

  async extract(videoId: string, options: TranscriptOptions = {}): Promise<Response | null> {
    const apiKey = Deno.env.get('SUPADATA_API_KEY');
    if (!apiKey) {
      console.error('SUPADATA_API_KEY not found');
      return null;
    }

    console.log('Attempting transcript extraction with Supadata API');

    // Try the working API endpoints
    const endpoints = [
      {
        name: 'Primary YouTube transcript API',
        url: 'https://api.supadata.ai/youtube/transcript',
        method: 'POST',
        body: { video_id: videoId, include_timestamps: true }
      },
      {
        name: 'Alternative transcript API', 
        url: 'https://api.supadata.ai/transcript/youtube',
        method: 'POST',
        body: { url: `https://youtube.com/watch?v=${videoId}`, format: 'text' }
      },
      {
        name: 'GET transcript API',
        url: `https://api.supadata.ai/youtube/transcript/${videoId}`,
        method: 'GET'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Calling Supadata API (${endpoint.name}) for video ${videoId}`);
        
        const requestOptions: RequestInit = {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }
        };

        if (endpoint.body) {
          requestOptions.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(endpoint.url, requestOptions);
        console.log(`Supadata API response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('Supadata API response received:', Object.keys(data));

          if (data.transcript || data.text || data.content) {
            const transcriptText = data.transcript || data.text || data.content;
            
            if (transcriptText && typeof transcriptText === 'string' && transcriptText.trim().length > 50) {
              console.log(`Successfully extracted transcript: ${transcriptText.length} characters`);
              
              return new Response(
                JSON.stringify({
                  success: true,
                  transcript: transcriptText,
                  metadata: {
                    videoId,
                    extractionMethod: 'supadata-api',
                    provider: 'supadata',
                    endpoint: endpoint.name
                  }
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
              );
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`Supadata API error (${endpoint.name}): ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error(`Error with ${endpoint.name}:`, error);
      }
    }

    console.error('All Supadata API attempts failed or returned insufficient content');
    return null;
  }
}
