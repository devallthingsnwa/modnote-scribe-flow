
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, options = {} } = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    console.log('Starting audio extraction and transcription for video:', videoId);

    // Step 1: Extract audio from YouTube video using Supadata
    const supadataApiKey = Deno.env.get('SUPADATA_API_KEY');
    if (!supadataApiKey) {
      throw new Error('Supadata API key not configured');
    }

    console.log('Extracting audio from YouTube video...');
    
    // Use the correct Supadata API endpoint for YouTube audio extraction
    const youtubeUrl = `https://youtube.com/watch?v=${videoId}`;
    
    try {
      console.log('Calling Supadata API for audio extraction...');
      
      const audioResponse = await fetch('https://api.supadata.ai/v1/extract-audio', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supadataApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          format: 'mp3',
          quality: options.quality || 'medium'
        })
      });

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error(`Audio extraction failed: ${audioResponse.status} - ${errorText}`);
        throw new Error(`Audio extraction failed: ${audioResponse.status} - ${errorText}`);
      }

      const audioData = await audioResponse.json();
      console.log('Audio extraction successful');

      if (!audioData.audio_url && !audioData.download_url) {
        throw new Error('No audio URL received from extraction');
      }

      // Step 2: Download the audio file
      const audioUrl = audioData.audio_url || audioData.download_url;
      console.log('Downloading audio file...');
      
      const audioFileResponse = await fetch(audioUrl);
      if (!audioFileResponse.ok) {
        throw new Error(`Failed to download audio: ${audioFileResponse.status}`);
      }

      const audioArrayBuffer = await audioFileResponse.arrayBuffer();
      const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));

      // Step 3: Convert audio to speech-to-text using Supadata
      console.log('Converting audio to text using Supadata speech-to-text...');
      
      const transcriptionResponse = await fetch('https://api.supadata.ai/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supadataApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          format: 'mp3',
          language: options.language || 'en',
          include_timestamps: options.include_timestamps ?? true
        })
      });

      if (!transcriptionResponse.ok) {
        const errorData = await transcriptionResponse.text();
        console.error('Speech-to-text API error:', errorData);
        throw new Error(`Speech-to-text failed: ${errorData}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      
      if (!transcriptionResult.text) {
        console.error('Speech-to-text processing failed:', transcriptionResult);
        throw new Error(transcriptionResult.error || 'Speech-to-text processing failed');
      }

      // Clean and format the transcript
      let cleanTranscript = transcriptionResult.text;
      
      // Remove excessive whitespace and normalize line breaks
      cleanTranscript = cleanTranscript
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // Ensure we have meaningful content
      if (cleanTranscript.length < 10) {
        throw new Error('Transcription too short - likely failed');
      }

      console.log('Audio transcription completed successfully');
      console.log(`Transcript length: ${cleanTranscript.length} characters`);

      return new Response(
        JSON.stringify({
          success: true,
          transcript: cleanTranscript,
          metadata: {
            videoId,
            extractionMethod: 'youtube-audio-transcription',
            provider: 'supadata-audio',
            confidence: transcriptionResult.confidence || 0.8,
            language: transcriptionResult.language || options.language || 'en',
            processing_time: transcriptionResult.processing_time,
            audio_quality: options.quality || 'medium',
            transcript_length: cleanTranscript.length,
            audio_extraction_method: 'supadata-api'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error('Audio extraction and transcription failed:', error);
      throw error;
    }

  } catch (error) {
    console.error('YouTube audio transcription error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Audio transcription failed',
        transcript: null,
        metadata: {
          error_type: 'transcription_failed',
          attempted_strategy: 'youtube-audio-transcription'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
