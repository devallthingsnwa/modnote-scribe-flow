
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
    format?: string;
  };
}

// Podsqueeze - Primary provider for podcasts and YouTube
async function transcribeWithPodsqueeze(url: string, options: any) {
  const apiKey = Deno.env.get('PODSQUEEZE_API_KEY');
  if (!apiKey) {
    throw new Error('Podsqueeze API key not configured');
  }

  console.log('🎯 Starting Podsqueeze transcription for:', url);

  const response = await fetch('https://api.podsqueeze.com/v1/transcribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      include_timestamps: options.include_timestamps ?? true,
      include_metadata: options.include_metadata ?? true,
      language: options.language || 'auto',
      format: 'detailed'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Podsqueeze API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.transcription && !data.text) {
    throw new Error('No transcription text received from Podsqueeze');
  }

  return {
    transcription: data.transcription || data.text,
    metadata: {
      title: data.metadata?.title,
      duration: data.metadata?.duration,
      author: data.metadata?.author || data.metadata?.channel,
      thumbnail: data.metadata?.thumbnail,
      language: data.metadata?.language,
      confidence: data.metadata?.confidence,
      provider: 'podsqueeze'
    }
  };
}

// Whisper - OSS option for audio files - Fixed language handling
async function transcribeWithWhisper(url: string, options: any) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured for Whisper');
  }

  console.log('🎵 Starting Whisper transcription for:', url);

  // For YouTube URLs, we can't directly download audio, so skip this provider
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    throw new Error('Whisper provider cannot process YouTube URLs directly');
  }

  // Download the audio first
  const audioResponse = await fetch(url);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');
  
  // Fix language parameter - use 'en' instead of 'auto'
  const language = options.language === 'auto' ? 'en' : (options.language || 'en');
  formData.append('language', language);
  formData.append('response_format', options.include_timestamps ? 'verbose_json' : 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return {
    transcription: data.text,
    metadata: {
      language: data.language,
      duration: data.duration,
      segments: options.include_timestamps ? data.segments : undefined,
      provider: 'whisper'
    }
  };
}

// Riverside.fm - Fallback provider
async function transcribeWithRiverside(url: string, options: any) {
  const apiKey = Deno.env.get('RIVERSIDE_API_KEY');
  if (!apiKey) {
    throw new Error('Riverside API key not configured');
  }

  console.log('🎬 Starting Riverside transcription for:', url);

  const response = await fetch('https://api.riverside.fm/v1/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      include_timestamps: options.include_timestamps ?? true,
      include_speaker_labels: true,
      language: options.language || 'auto'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Riverside API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.transcription && !data.text) {
    throw new Error('No transcription text received from Riverside');
  }

  return {
    transcription: data.transcription || data.text,
    metadata: {
      title: data.metadata?.title,
      duration: data.metadata?.duration,
      speakers: data.speakers,
      language: data.language,
      provider: 'riverside'
    }
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

    console.log(`🚀 Starting transcription with ${provider} for URL: ${url.substring(0, 50)}...`);
    const startTime = Date.now();

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

    const processingTime = Date.now() - startTime;
    console.log(`✅ Transcription completed with ${provider} in ${processingTime}ms`);

    // Add processing metadata
    result.metadata = {
      ...result.metadata,
      processingTime,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ Transcription error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Transcription failed',
        details: error.toString(),
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
