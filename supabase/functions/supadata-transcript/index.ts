
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptRequest {
  videoId: string;
  method: 'transcript' | 'audio-transcription';
  options?: {
    includeTimestamps?: boolean;
    language?: string;
    audioQuality?: 'standard' | 'high';
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, method, options = {} }: TranscriptRequest = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    console.log(`🎯 Processing ${method} for video: ${videoId}`);
    const startTime = Date.now();

    const supadata_api_key = Deno.env.get('SUPADATA_API_KEY');
    if (!supadata_api_key) {
      throw new Error('Supadata API key not configured');
    }

    let result;
    
    if (method === 'transcript') {
      // Try to get transcript from captions first
      result = await fetchTranscriptFromCaptions(videoId, supadata_api_key, options);
    } else if (method === 'audio-transcription') {
      // Transcribe audio directly
      result = await transcribeVideoAudio(videoId, supadata_api_key, options);
    } else {
      throw new Error(`Unsupported method: ${method}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ ${method} completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        processingTime,
        method,
        videoId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ Supadata processing error:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Supadata processing failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchTranscriptFromCaptions(videoId: string, apiKey: string, options: any) {
  console.log('📝 Fetching transcript from captions...');
  
  const response = await fetch('https://api.supadata.ai/v1/youtube/transcript', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_id: videoId,
      include_timestamps: options.includeTimestamps ?? true,
      language: options.language || 'auto'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supadata captions API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.transcript && !data.text) {
    throw new Error('No transcript text received from Supadata captions');
  }

  return {
    transcript: data.transcript || data.text,
    segments: data.segments,
    metadata: data.metadata
  };
}

async function transcribeVideoAudio(videoId: string, apiKey: string, options: any) {
  console.log('🎵 Transcribing video audio...');
  
  const response = await fetch('https://api.supadata.ai/v1/youtube/transcribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_id: videoId,
      language: options.language || 'auto',
      include_timestamps: options.includeTimestamps ?? false
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supadata audio transcription API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.transcript && !data.text) {
    throw new Error('No transcript text received from Supadata audio transcription');
  }

  return {
    transcript: data.transcript || data.text,
    metadata: data.metadata
  };
}
