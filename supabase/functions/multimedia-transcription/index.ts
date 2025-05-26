
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  provider: 'podsqueeze' | 'whisper' | 'riverside';
  url: string;
  options?: {
    include_metadata?: boolean;
    include_timestamps?: boolean;
    language?: string;
  };
}

async function transcribeWithPodsqueeze(url: string, options: any) {
  const apiKey = Deno.env.get('PODSQUEEZE_API_KEY');
  if (!apiKey) {
    throw new Error('Podsqueeze API key not configured');
  }

  const response = await fetch('https://api.podsqueeze.com/v1/transcribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      include_timestamps: options.include_timestamps,
      include_metadata: options.include_metadata,
      language: options.language || 'auto'
    }),
  });

  if (!response.ok) {
    throw new Error(`Podsqueeze API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    transcription: data.transcription,
    metadata: data.metadata
  };
}

async function transcribeWithWhisper(url: string, options: any) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Download the audio first
  const audioResponse = await fetch(url);
  if (!audioResponse.ok) {
    throw new Error('Failed to download audio');
  }

  const audioBlob = await audioResponse.blob();
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', options.include_timestamps ? 'verbose_json' : 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    transcription: data.text,
    metadata: options.include_timestamps ? {
      segments: data.segments
    } : {}
  };
}

async function transcribeWithRiverside(url: string, options: any) {
  const apiKey = Deno.env.get('RIVERSIDE_API_KEY');
  if (!apiKey) {
    throw new Error('Riverside API key not configured');
  }

  const response = await fetch('https://api.riverside.fm/v1/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      include_timestamps: options.include_timestamps,
      language: options.language || 'auto'
    }),
  });

  if (!response.ok) {
    throw new Error(`Riverside API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    transcription: data.transcription,
    metadata: data.metadata
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, url, options = {} }: TranscriptionRequest = await req.json();

    if (!provider || !url) {
      throw new Error('Provider and URL are required');
    }

    console.log(`Starting transcription with ${provider} for URL: ${url}`);

    let result;

    switch (provider) {
      case 'podsqueeze':
        result = await transcribeWithPodsqueeze(url, options);
        break;
      case 'whisper':
        result = await transcribeWithWhisper(url, options);
        break;
      case 'riverside':
        result = await transcribeWithRiverside(url, options);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    console.log(`Transcription completed with ${provider}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Transcription failed',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
