
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, options = {} } = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    console.log(`Starting audio extraction and transcription for video: ${videoId}`);

    // Get Supadata API key
    const supadataApiKey = Deno.env.get('SUPADATA_API_KEY');
    if (!supadataApiKey) {
      throw new Error('Supadata API key not configured');
    }

    const startTime = Date.now();

    // Corrected Supadata API endpoints for audio transcription
    const audioTranscriptionMethods = [
      // Method 1: Direct video transcription (most efficient)
      {
        url: 'https://api.supadata.ai/youtube/transcribe',
        body: {
          video_id: videoId,
          audio_format: options.audioFormat || 'mp3',
          language: options.language || 'en',
          quality: options.quality || 'medium'
        },
        description: 'Direct video transcription'
      },
      // Method 2: Two-step process - extract then transcribe
      {
        url: 'https://api.supadata.ai/transcribe',
        body: {
          source: 'youtube',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          language: options.language || 'en',
          format: options.audioFormat || 'mp3'
        },
        description: 'URL-based transcription'
      },
      // Method 3: Audio extraction first, then transcription
      {
        url: 'https://api.supadata.ai/audio/transcribe',
        body: {
          video_id: videoId,
          source: 'youtube',
          language: options.language || 'en'
        },
        description: 'Audio extraction and transcription'
      }
    ];

    let transcriptionData = null;
    let transcriptionMethod = '';

    // Try different transcription methods
    for (const method of audioTranscriptionMethods) {
      try {
        console.log(`Trying transcription method: ${method.description}`);
        
        const transcriptionResponse = await fetch(method.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supadataApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(method.body),
        });

        console.log(`Transcription response status: ${transcriptionResponse.status}`);

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          console.warn(`Transcription failed with ${method.description}: ${transcriptionResponse.status} - ${errorText}`);
          
          if (transcriptionResponse.status === 401) {
            console.error("Authentication failed - check API key");
            break; // Don't try other methods if auth fails
          }
          
          continue;
        }

        const responseText = await transcriptionResponse.text();
        try {
          transcriptionData = JSON.parse(responseText);
        } catch (parseError) {
          console.warn("Failed to parse transcription response as JSON");
          if (responseText.trim().length > 50) {
            transcriptionData = { text: responseText.trim() };
          } else {
            continue;
          }
        }

        transcriptionMethod = method.description;
        console.log(`Transcription successful with: ${method.description}`);
        break;
        
      } catch (error) {
        console.warn(`Transcription method failed: ${method.description}`, error);
        continue;
      }
    }

    if (!transcriptionData) {
      throw new Error('All transcription methods failed');
    }

    // Extract transcript text from various response formats
    let transcript = '';
    if (transcriptionData.text) {
      transcript = transcriptionData.text.trim();
    } else if (transcriptionData.transcript) {
      transcript = transcriptionData.transcript.trim();
    } else if (transcriptionData.transcription) {
      transcript = transcriptionData.transcription.trim();
    } else if (transcriptionData.data?.text) {
      transcript = transcriptionData.data.text.trim();
    } else if (transcriptionData.result?.text) {
      transcript = transcriptionData.result.text.trim();
    } else if (transcriptionData.content) {
      transcript = transcriptionData.content.trim();
    }

    if (!transcript || transcript.length < 10) {
      throw new Error('Transcription resulted in empty or very short text');
    }

    const processingTime = Date.now() - startTime;

    console.log(`Audio transcription completed: ${transcript.length} characters in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        transcript: transcript,
        metadata: {
          videoId,
          extractionMethod: `youtube-audio-supadata (${transcriptionMethod})`,
          audioQuality: options.quality || 'medium',
          language: transcriptionData.language || options.language || 'en',
          duration: transcriptionData.duration,
          confidence: transcriptionData.confidence,
          processingTime: processingTime,
          audioFormat: options.audioFormat || 'mp3'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("YouTube audio transcription error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'YouTube audio extraction and transcription failed',
        transcript: "Unable to extract and transcribe audio from this YouTube video. The video may be restricted, private, or the Supadata service may be temporarily unavailable.",
        metadata: {
          videoId: "unknown",
          extractionMethod: 'youtube-audio-supadata',
          processingTime: 0
        }
      }),
      {
        status: 200, // Return 200 for consistent client handling
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
