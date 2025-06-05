
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

    // Step 1: Extract audio from YouTube video using Supadata
    console.log('Extracting audio from YouTube video...');
    const audioExtractionResponse = await fetch('https://api.supadata.ai/v1/youtube/extract-audio', {
      method: 'POST',
      headers: {
        'x-api-key': supadataApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: videoId,
        format: options.audioFormat || 'mp3',
        quality: options.quality || 'medium'
      }),
    });

    if (!audioExtractionResponse.ok) {
      const errorText = await audioExtractionResponse.text();
      throw new Error(`Audio extraction failed: ${audioExtractionResponse.status} - ${errorText}`);
    }

    const audioData = await audioExtractionResponse.json();
    console.log('Audio extraction successful');

    if (!audioData.audioUrl && !audioData.audioContent) {
      throw new Error('No audio content received from extraction');
    }

    // Step 2: Transcribe the extracted audio using Supadata Speech-to-Text
    console.log('Transcribing extracted audio...');
    
    let transcriptionResponse;
    
    if (audioData.audioContent) {
      // Direct audio content (base64)
      transcriptionResponse = await fetch('https://api.supadata.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'x-api-key': supadataApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioData.audioContent,
          format: options.audioFormat || 'mp3',
          language: options.language || 'en',
          model: 'whisper-1'
        }),
      });
    } else if (audioData.audioUrl) {
      // Audio URL - download and transcribe
      const audioResponse = await fetch(audioData.audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      
      transcriptionResponse = await fetch('https://api.supadata.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'x-api-key': supadataApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          format: options.audioFormat || 'mp3',
          language: options.language || 'en',
          model: 'whisper-1'
        }),
      });
    } else {
      throw new Error('No valid audio data for transcription');
    }

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      throw new Error(`Transcription failed: ${transcriptionResponse.status} - ${errorText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    console.log('Transcription successful');

    // Extract transcript text
    let transcript = '';
    if (transcriptionData.text) {
      transcript = transcriptionData.text.trim();
    } else if (transcriptionData.transcript) {
      transcript = transcriptionData.transcript.trim();
    } else if (transcriptionData.transcription) {
      transcript = transcriptionData.transcription.trim();
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
          extractionMethod: 'youtube-audio-supadata',
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
        transcript: "Unable to extract and transcribe audio from this YouTube video. The video may be restricted, private, or not have extractable audio.",
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
