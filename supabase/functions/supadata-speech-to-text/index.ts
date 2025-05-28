
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced base64 processing with better memory management
function processBase64Chunks(base64String: string, chunkSize = 16384) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  try {
    while (position < base64String.length) {
      const chunk = base64String.slice(position, position + chunkSize);
      
      // Validate base64 chunk
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(chunk)) {
        throw new Error('Invalid base64 format');
      }
      
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
  } catch (error) {
    console.error("Error processing base64 chunks:", error);
    throw new Error(`Base64 processing failed: ${error.message}`);
  }
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

    console.log("Processing enhanced Supadata speech-to-text request, audio format:", format);

    // Get Supadata API key
    const supadataApiKey = Deno.env.get('SUPADATA_API_KEY');
    if (!supadataApiKey) {
      throw new Error('Supadata API key not configured');
    }

    // Enhanced audio processing with validation
    console.log("Converting and validating base64 audio...");
    const binaryAudio = processBase64Chunks(audio);
    console.log("Audio processing successful, size:", binaryAudio.length, "bytes");
    
    if (binaryAudio.length === 0) {
      throw new Error('Processed audio data is empty');
    }

    const startTime = Date.now();

    // Enhanced form data preparation
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: format || 'audio/webm' });
    formData.append('audio', blob, 'audio.webm');
    
    // Enhanced options
    formData.append('language', options.language || 'en');
    formData.append('model', 'whisper-1'); // Specify model
    formData.append('response_format', 'verbose_json'); // Get detailed response
    
    if (options.include_confidence) {
      formData.append('include_confidence', 'true');
    }
    if (options.include_timestamps) {
      formData.append('include_timestamps', 'true');
    }

    console.log("Sending enhanced request to Supadata Speech-to-Text API...");

    // Multiple API endpoints with better error handling
    const apiEndpoints = [
      'https://api.supadata.ai/v1/audio/transcribe',
      'https://api.supadata.ai/v1/speech-to-text', 
      'https://api.supadata.ai/v1/audio/transcriptions',
      'https://api.supadata.ai/transcribe' // Additional endpoint
    ];

    let lastError = null;
    let successfulEndpoint = null;

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying enhanced Supadata endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': supadataApiKey,
            'Authorization': `Bearer ${supadataApiKey}`,
            'Accept': 'application/json',
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
          // Try to extract text from non-JSON response
          if (responseText && responseText.trim().length > 0) {
            result = { text: responseText.trim() };
          } else {
            throw new Error('Invalid JSON response and no fallback text');
          }
        }

        console.log("Enhanced Supadata API response:", JSON.stringify(result, null, 2));

        const processingTime = Date.now() - startTime;

        // Enhanced response parsing
        let transcriptionText = '';
        let confidence = undefined;
        let duration = undefined;
        let language = options.language || 'en';

        // Check various response structures
        if (result.transcription && typeof result.transcription === 'string') {
          transcriptionText = result.transcription.trim();
        } else if (result.text && typeof result.text === 'string') {
          transcriptionText = result.text.trim();
        } else if (result.transcript && typeof result.transcript === 'string') {
          transcriptionText = result.transcript.trim();
        } else if (result.content && typeof result.content === 'string') {
          transcriptionText = result.content.trim();
        } else if (result.data && result.data.text) {
          transcriptionText = result.data.text.trim();
        }

        // Extract enhanced metadata
        if (result.confidence !== undefined) {
          confidence = result.confidence;
        }
        if (result.duration !== undefined) {
          duration = result.duration;
        }
        if (result.language) {
          language = result.language;
        }
        
        // Extract confidence from segments if available
        if (!confidence && result.segments && result.segments.length > 0) {
          const avgConfidence = result.segments.reduce((sum: number, seg: any) => 
            sum + (seg.confidence || seg.avg_logprob || 0), 0) / result.segments.length;
          confidence = avgConfidence;
        }

        // Enhanced validation
        if (transcriptionText && transcriptionText.length > 0) {
          console.log(`Enhanced Supadata transcription successful via ${endpoint}: ${transcriptionText.length} characters`);
          successfulEndpoint = endpoint;
          
          return new Response(
            JSON.stringify({ 
              text: transcriptionText,
              confidence: confidence,
              language: language,
              duration: duration,
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
        console.error(`Enhanced Supadata request failed at ${endpoint}:`, requestError);
        lastError = requestError;
        continue;
      }
    }

    // If all endpoints failed
    throw lastError || new Error('All enhanced Supadata endpoints failed');

  } catch (error) {
    console.error("Enhanced Supadata speech-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Enhanced Supadata speech-to-text processing failed',
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
