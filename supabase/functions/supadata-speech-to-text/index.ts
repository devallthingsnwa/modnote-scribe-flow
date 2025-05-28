
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 audio in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

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

    // Process audio in chunks to prevent memory issues
    console.log("Converting base64 audio to binary...");
    const binaryAudio = processBase64Chunks(audio);
    console.log("Audio size:", binaryAudio.length, "bytes");

    const startTime = Date.now();

    // Prepare form data for Supadata API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: format || 'audio/webm' });
    formData.append('audio', blob, 'audio.webm');
    
    // Add options
    if (options.language) {
      formData.append('language', options.language);
    }
    if (options.include_confidence) {
      formData.append('include_confidence', 'true');
    }
    if (options.include_timestamps) {
      formData.append('include_timestamps', 'true');
    }

    console.log("Sending request to Supadata Speech-to-Text API...");

    // Multiple API endpoints to try for better success rate
    const apiEndpoints = [
      'https://api.supadata.ai/v1/audio/transcribe',
      'https://api.supadata.ai/v1/speech-to-text',
      'https://api.supadata.ai/v1/audio/transcriptions'
    ];

    let lastError = null;

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying Supadata endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': supadataApiKey,
            'Authorization': `Bearer ${supadataApiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Supadata API error at ${endpoint}:`, response.status, errorText);
          lastError = new Error(`Supadata API error: ${response.status} - ${errorText}`);
          continue; // Try next endpoint
        }

        const result = await response.json();
        console.log("Supadata API response received:", JSON.stringify(result, null, 2));

        const processingTime = Date.now() - startTime;

        // Handle various response formats from Supadata
        let transcriptionText = '';
        let confidence = undefined;
        let duration = undefined;
        let language = options.language || 'en';

        // Check different possible response structures
        if (result.transcription && typeof result.transcription === 'string') {
          transcriptionText = result.transcription.trim();
        } else if (result.text && typeof result.text === 'string') {
          transcriptionText = result.text.trim();
        } else if (result.transcript && typeof result.transcript === 'string') {
          transcriptionText = result.transcript.trim();
        } else if (result.content && typeof result.content === 'string') {
          transcriptionText = result.content.trim();
        }

        // Extract metadata
        if (result.confidence !== undefined) {
          confidence = result.confidence;
        }
        if (result.duration !== undefined) {
          duration = result.duration;
        }
        if (result.language) {
          language = result.language;
        }

        // Validate transcription
        if (transcriptionText && transcriptionText.length > 0) {
          console.log(`Supadata transcription successful via ${endpoint}: ${transcriptionText.length} characters`);
          
          return new Response(
            JSON.stringify({ 
              text: transcriptionText,
              confidence: confidence,
              language: language,
              duration: duration,
              processing_time: processingTime,
              provider: 'supadata',
              endpoint: endpoint
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
        continue; // Try next endpoint
      }
    }

    // If all endpoints failed
    throw lastError || new Error('All Supadata endpoints failed');

  } catch (error) {
    console.error("Supadata speech-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Supadata speech-to-text processing failed'
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
