
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
    const { audio, format, options = {} } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log("Processing Supadata speech-to-text request, audio format:", format);

    // Get Supadata API key
    const supadataApiKey = Deno.env.get('SUPADATA_API_KEY');
    if (!supadataApiKey) {
      throw new Error('Supadata API key not configured');
    }

    // Convert base64 to binary
    console.log("Converting base64 audio to binary...");
    const binaryString = atob(audio);
    const binaryAudio = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryAudio[i] = binaryString.charCodeAt(i);
    }
    console.log("Audio processing successful, size:", binaryAudio.length, "bytes");
    
    if (binaryAudio.length === 0) {
      throw new Error('Processed audio data is empty');
    }

    const startTime = Date.now();

    // Prepare form data for Supadata API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: format || 'audio/webm' });
    formData.append('audio', blob, 'audio.webm');
    formData.append('language', options.language || 'en');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    console.log("Sending request to Supadata Speech-to-Text API...");

    // Try multiple Supadata API endpoints
    const apiEndpoints = [
      'https://api.supadata.ai/v1/audio/transcriptions',
      'https://api.supadata.ai/v1/speech-to-text',
      'https://api.supadata.ai/transcribe'
    ];

    let lastError = null;

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying Supadata endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supadataApiKey}`,
            'x-api-key': supadataApiKey,
          },
          body: formData,
        });

        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, response.status, responseText.substring(0, 200));

        if (!response.ok) {
          console.warn(`Supadata API error at ${endpoint}:`, response.status, responseText);
          lastError = new Error(`Supadata API error: ${response.status} - ${responseText}`);
          continue;
        }

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          if (responseText && responseText.trim().length > 0) {
            result = { text: responseText.trim() };
          } else {
            throw new Error('Invalid response format');
          }
        }

        console.log("Supadata API response:", JSON.stringify(result, null, 2));

        const processingTime = Date.now() - startTime;

        // Extract transcription text from various possible response formats
        let transcriptionText = '';
        if (result.transcription && typeof result.transcription === 'string') {
          transcriptionText = result.transcription.trim();
        } else if (result.text && typeof result.text === 'string') {
          transcriptionText = result.text.trim();
        } else if (result.transcript && typeof result.transcript === 'string') {
          transcriptionText = result.transcript.trim();
        } else if (result.content && typeof result.content === 'string') {
          transcriptionText = result.content.trim();
        }

        if (transcriptionText && transcriptionText.length > 0) {
          console.log(`Supadata transcription successful via ${endpoint}: ${transcriptionText.length} characters`);
          
          return new Response(
            JSON.stringify({ 
              text: transcriptionText,
              confidence: result.confidence,
              language: result.language || options.language || 'en',
              duration: result.duration,
              processing_time: processingTime,
              provider: 'supadata',
              endpoint: endpoint,
              success: true
            }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              } 
            }
          );
        } else {
          console.warn(`Supadata returned empty transcription at ${endpoint}`);
          lastError = new Error('Empty transcription received from Supadata');
        }

      } catch (requestError) {
        console.error(`Supadata request failed at ${endpoint}:`, requestError);
        lastError = requestError;
        continue;
      }
    }

    // If all endpoints failed
    throw lastError || new Error('All Supadata endpoints failed');

  } catch (error) {
    console.error("Supadata speech-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Supadata speech-to-text processing failed',
        success: false,
        provider: 'supadata'
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
