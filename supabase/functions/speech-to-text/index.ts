
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
    const { audio, format } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log("Processing speech-to-text request, audio format:", format);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Process audio in chunks to prevent memory issues
    console.log("Converting base64 audio to binary...");
    const binaryAudio = processBase64Chunks(audio);
    console.log("Audio size:", binaryAudio.length, "bytes");

    // Prepare form data for OpenAI Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: format || 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Can be made configurable
    formData.append('response_format', 'verbose_json'); // Get confidence scores

    console.log("Sending request to OpenAI Whisper API...");

    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Whisper API response received, text length:", result.text?.length || 0);

    // Extract confidence if available (from segments)
    let avgConfidence = undefined;
    if (result.segments && result.segments.length > 0) {
      const confidenceSum = result.segments.reduce((sum: number, segment: any) => {
        return sum + (segment.avg_logprob || 0);
      }, 0);
      avgConfidence = Math.exp(confidenceSum / result.segments.length);
    }

    return new Response(
      JSON.stringify({ 
        text: result.text,
        confidence: avgConfidence,
        language: result.language,
        duration: result.duration
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error("Speech-to-text error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Speech-to-text processing failed'
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
