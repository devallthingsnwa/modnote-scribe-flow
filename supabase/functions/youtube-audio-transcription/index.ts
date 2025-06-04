
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
    
    // Try multiple audio extraction endpoints
    const audioExtractionEndpoints = [
      {
        name: 'Direct audio extraction endpoint',
        url: 'https://api.supadata.ai/youtube/audio',
        method: 'POST',
        body: { 
          video_id: videoId,
          format: 'mp3',
          quality: options.quality || 'medium'
        }
      },
      {
        name: 'Alternative audio extraction endpoint',
        url: 'https://api.supadata.ai/extract/youtube-audio',
        method: 'POST',
        body: { 
          url: `https://youtube.com/watch?v=${videoId}`,
          audio_format: 'mp3'
        }
      },
      {
        name: 'Legacy audio extraction endpoint',
        url: 'https://api.supadata.ai/v1/youtube/extract-audio',
        method: 'POST',
        body: { video_id: videoId }
      }
    ];

    let audioData = null;
    let lastError = null;

    for (const endpoint of audioExtractionEndpoints) {
      try {
        console.log(`Trying audio extraction method: ${endpoint.name}`);
        
        const audioResponse = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${supadataApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(endpoint.body)
        });

        if (audioResponse.ok) {
          const responseData = await audioResponse.json();
          console.log(`Audio extraction successful with ${endpoint.name}`);
          
          if (responseData.audio_url || responseData.download_url || responseData.url) {
            audioData = responseData;
            break;
          } else if (responseData.audio_data || responseData.data) {
            audioData = responseData;
            break;
          }
        } else {
          const errorText = await audioResponse.text();
          console.error(`Audio extraction failed with ${endpoint.name}: ${audioResponse.status} - ${errorText}`);
          lastError = new Error(`Audio extraction failed: ${audioResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.error(`Error with ${endpoint.name}:`, error);
        lastError = error;
      }
    }

    if (!audioData) {
      throw lastError || new Error('No audio content received from any extraction method');
    }

    // Step 2: Convert audio to speech-to-text using Supadata
    console.log('Converting audio to text using Supadata speech-to-text...');
    
    let audioContent = null;
    
    // If we have a URL, download the audio
    if (audioData.audio_url || audioData.download_url || audioData.url) {
      const audioUrl = audioData.audio_url || audioData.download_url || audioData.url;
      try {
        const audioResponse = await fetch(audioUrl);
        if (audioResponse.ok) {
          const audioArrayBuffer = await audioResponse.arrayBuffer();
          audioContent = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
        } else {
          throw new Error(`Failed to download audio: ${audioResponse.status}`);
        }
      } catch (error) {
        console.error('Error downloading audio:', error);
        throw new Error(`Audio download failed: ${error.message}`);
      }
    } else if (audioData.audio_data || audioData.data) {
      audioContent = audioData.audio_data || audioData.data;
    }

    if (!audioContent) {
      throw new Error('No audio content available for transcription');
    }

    // Call Supadata speech-to-text
    const transcriptionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/supadata-speech-to-text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioContent,
        format: 'audio/mp3',
        options: {
          language: options.language || 'en',
          include_timestamps: options.include_timestamps ?? true
        }
      })
    });

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.text();
      console.error('Speech-to-text API error:', errorData);
      throw new Error(`Speech-to-text failed: ${errorData}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    
    if (!transcriptionResult.success || !transcriptionResult.text) {
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
