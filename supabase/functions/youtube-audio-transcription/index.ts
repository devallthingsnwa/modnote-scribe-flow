
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

    // Updated Supadata API endpoints for audio extraction
    const audioExtractionMethods = [
      // Method 1: Direct audio extraction
      {
        url: 'https://api.supadata.ai/v1/audio/extract',
        body: {
          source: 'youtube',
          video_id: videoId,
          format: options.audioFormat || 'mp3',
          quality: options.quality || 'medium'
        },
        description: 'Direct audio extraction endpoint'
      },
      // Method 2: Alternative endpoint structure
      {
        url: 'https://api.supadata.ai/extract/audio',
        body: {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          output_format: options.audioFormat || 'mp3',
          quality: options.quality || 'medium'
        },
        description: 'Alternative audio extraction endpoint'
      },
      // Method 3: Legacy endpoint
      {
        url: 'https://api.supadata.ai/youtube/audio',
        body: {
          video_id: videoId,
          format: options.audioFormat || 'mp3'
        },
        description: 'Legacy audio extraction endpoint'
      }
    ];

    let audioData = null;
    let extractionMethod = '';

    // Try different audio extraction methods
    for (const method of audioExtractionMethods) {
      try {
        console.log(`Trying audio extraction method: ${method.description}`);
        
        const audioExtractionResponse = await fetch(method.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supadataApiKey}`,
            'X-API-Key': supadataApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(method.body),
        });

        if (!audioExtractionResponse.ok) {
          const errorText = await audioExtractionResponse.text();
          console.warn(`Audio extraction failed with ${method.description}: ${audioExtractionResponse.status} - ${errorText}`);
          continue;
        }

        audioData = await audioExtractionResponse.json();
        extractionMethod = method.description;
        console.log(`Audio extraction successful with: ${method.description}`);
        break;
        
      } catch (error) {
        console.warn(`Audio extraction method failed: ${method.description}`, error);
        continue;
      }
    }

    if (!audioData || (!audioData.audioUrl && !audioData.audioContent && !audioData.url && !audioData.download_url)) {
      throw new Error('No audio content received from any extraction method');
    }

    // Step 2: Transcribe the extracted audio using Supadata Speech-to-Text
    console.log('Transcribing extracted audio...');
    
    // Determine audio source
    const audioSource = audioData.audioUrl || audioData.url || audioData.download_url;
    const audioContent = audioData.audioContent || audioData.content;
    
    let transcriptionResponse;
    
    // Updated transcription endpoints
    const transcriptionMethods = [
      // Method 1: Direct audio content
      ...(audioContent ? [{
        url: 'https://api.supadata.ai/v1/transcribe',
        body: {
          audio: audioContent,
          format: options.audioFormat || 'mp3',
          language: options.language || 'en',
          model: 'whisper-1'
        },
        description: 'Direct audio content transcription'
      }] : []),
      // Method 2: Audio URL
      ...(audioSource ? [{
        url: 'https://api.supadata.ai/v1/transcribe/url',
        body: {
          audio_url: audioSource,
          language: options.language || 'en',
          model: 'whisper-1'
        },
        description: 'Audio URL transcription'
      }] : []),
      // Method 3: Legacy transcription endpoint
      {
        url: 'https://api.supadata.ai/transcribe',
        body: {
          audio: audioContent || audioSource,
          language: options.language || 'en'
        },
        description: 'Legacy transcription endpoint'
      }
    ];

    let transcriptionData = null;
    let transcriptionMethod = '';

    for (const method of transcriptionMethods) {
      try {
        console.log(`Trying transcription method: ${method.description}`);
        
        // If we have an audio URL, download it first
        if (method.body.audio_url && !method.body.audio) {
          try {
            const audioResponse = await fetch(method.body.audio_url);
            if (audioResponse.ok) {
              const audioBuffer = await audioResponse.arrayBuffer();
              const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
              method.body.audio = base64Audio;
              delete method.body.audio_url;
            }
          } catch (downloadError) {
            console.warn('Failed to download audio from URL:', downloadError);
            continue;
          }
        }

        transcriptionResponse = await fetch(method.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supadataApiKey}`,
            'X-API-Key': supadataApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(method.body),
        });

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          console.warn(`Transcription failed with ${method.description}: ${transcriptionResponse.status} - ${errorText}`);
          continue;
        }

        transcriptionData = await transcriptionResponse.json();
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
    }

    if (!transcript || transcript.length < 10) {
      throw new Error('Transcription resulted in empty or very short text');
    }

    const processingTime = Date.now() - startTime;

    console.log(`Audio extraction and transcription completed: ${transcript.length} characters in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        transcript: transcript,
        metadata: {
          videoId,
          extractionMethod: `youtube-audio-supadata (${extractionMethod} + ${transcriptionMethod})`,
          audioQuality: audioData.quality || options.quality || 'medium',
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
