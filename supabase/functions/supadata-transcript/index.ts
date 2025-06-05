
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptRequest {
  videoId: string;
  method: 'transcript' | 'audio-transcription' | 'fallback-chain';
  retryAttempt?: number;
  options?: {
    includeTimestamps?: boolean;
    language?: string;
    audioQuality?: 'standard' | 'high';
  };
}

interface TranscriptResponse {
  success: boolean;
  transcript?: string;
  segments?: any[];
  metadata?: {
    title?: string;
    channel?: string;
    duration?: string;
    thumbnail?: string;
    reason?: string;
    method?: string;
  };
  error?: string;
  processingTime?: number;
  method?: string;
  videoId?: string;
  retryable?: boolean;
  nextMethod?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, method, retryAttempt = 0, options = {} }: TranscriptRequest = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    console.log(`🎯 Processing ${method} for video: ${videoId} (attempt ${retryAttempt + 1})`);
    const startTime = Date.now();

    let result: TranscriptResponse;
    
    if (method === 'fallback-chain') {
      result = await processWithFallbackChain(videoId, options, retryAttempt);
    } else if (method === 'transcript') {
      result = await fetchTranscriptFromCaptions(videoId, options);
    } else if (method === 'audio-transcription') {
      result = await transcribeVideoAudio(videoId, options);
    } else {
      throw new Error(`Unsupported method: ${method}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ ${method} completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        ...result,
        processingTime,
        videoId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ Processing error:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Processing failed',
        timestamp: new Date().toISOString(),
        retryable: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processWithFallbackChain(videoId: string, options: any, retryAttempt: number): Promise<TranscriptResponse> {
  console.log('🔗 Starting fallback chain processing...');
  
  // Step 1: Try captions first
  console.log('📝 Step 1: Attempting caption extraction...');
  const captionResult = await fetchTranscriptFromCaptions(videoId, options);
  
  if (captionResult.success && captionResult.transcript) {
    console.log('✅ Caption extraction successful');
    return {
      ...captionResult,
      method: 'captions',
      metadata: { ...captionResult.metadata, method: 'captions' }
    };
  }
  
  console.log('⚠️ Caption extraction failed, proceeding to audio extraction...');
  
  // Step 2: Try audio transcription
  console.log('🎵 Step 2: Attempting audio transcription...');
  const audioResult = await transcribeVideoAudio(videoId, options);
  
  if (audioResult.success && audioResult.transcript) {
    console.log('✅ Audio transcription successful');
    return {
      ...audioResult,
      method: 'audio-transcription',
      metadata: { ...audioResult.metadata, method: 'audio-transcription' }
    };
  }
  
  console.log('⚠️ Audio transcription failed, trying external services...');
  
  // Step 3: Try external transcription services
  console.log('🌐 Step 3: Attempting external transcription services...');
  const externalResult = await tryExternalTranscriptionServices(videoId, options);
  
  if (externalResult.success && externalResult.transcript) {
    console.log('✅ External transcription successful');
    return externalResult;
  }
  
  // Step 4: Create fallback note with metadata
  console.log('📋 Step 4: Creating fallback note with metadata...');
  const metadata = await fetchVideoMetadata(videoId);
  
  return {
    success: true,
    transcript: generateFallbackContent(videoId, metadata),
    metadata: {
      ...metadata,
      method: 'fallback',
      reason: 'All transcription methods failed'
    },
    method: 'fallback'
  };
}

async function fetchTranscriptFromCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('📝 Fetching transcript from captions...');
  
  const supadata_api_key = Deno.env.get('SUPADATA_API_KEY');
  if (!supadata_api_key) {
    return {
      success: false,
      error: 'Supadata API key not configured',
      retryable: false
    };
  }

  try {
    const response = await fetch('https://api.supadata.ai/v1/youtube/transcript', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supadata_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        format: 'json',
        timestamps: options.includeTimestamps ?? true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supadata API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Captions unavailable (${response.status})`,
        retryable: response.status >= 500,
        nextMethod: 'audio-transcription'
      };
    }

    const data = await response.json();
    
    if (!data.transcript && !data.text && !data.content) {
      return {
        success: false,
        error: 'Captions unavailable',
        retryable: false,
        nextMethod: 'audio-transcription'
      };
    }

    return {
      success: true,
      transcript: data.transcript || data.text || data.content,
      segments: data.segments || data.chunks,
      metadata: data.metadata || data.video_info
    };
  } catch (error) {
    console.error('Caption extraction error:', error);
    return {
      success: false,
      error: 'Captions unavailable',
      retryable: true,
      nextMethod: 'audio-transcription'
    };
  }
}

async function transcribeVideoAudio(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🎵 Transcribing video audio...');
  
  const supadata_api_key = Deno.env.get('SUPADATA_API_KEY');
  if (!supadata_api_key) {
    return {
      success: false,
      error: 'Supadata API key not configured',
      retryable: false
    };
  }

  try {
    const response = await fetch('https://api.supadata.ai/v1/youtube/transcribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supadata_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        audio_format: 'mp3',
        language: options.language || 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supadata audio API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Audio download failed (${response.status})`,
        retryable: response.status >= 500,
        nextMethod: 'external-services'
      };
    }

    const data = await response.json();
    
    if (!data.transcript && !data.text && !data.content) {
      return {
        success: false,
        error: 'Audio transcription failed',
        retryable: false,
        nextMethod: 'external-services'
      };
    }

    return {
      success: true,
      transcript: data.transcript || data.text || data.content,
      metadata: data.metadata || data.video_info
    };
  } catch (error) {
    console.error('Audio transcription error:', error);
    return {
      success: false,
      error: 'Audio download failed',
      retryable: true,
      nextMethod: 'external-services'
    };
  }
}

async function tryExternalTranscriptionServices(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🌐 Trying external transcription services...');
  
  const services = ['podsqueeze', 'whisper', 'riverside'];
  
  for (const service of services) {
    console.log(`🔄 Trying ${service}...`);
    
    try {
      const result = await callExternalService(service, videoId, options);
      if (result.success) {
        return {
          ...result,
          method: service,
          metadata: { ...result.metadata, method: service }
        };
      }
    } catch (error) {
      console.error(`${service} failed:`, error);
      continue;
    }
  }
  
  return {
    success: false,
    error: 'All external transcription services failed',
    retryable: false
  };
}

async function callExternalService(service: string, videoId: string, options: any): Promise<TranscriptResponse> {
  // This is a placeholder for external service calls
  // In a real implementation, you would call PodSqueeze, Whisper, or Riverside.fm APIs
  console.log(`📡 Calling ${service} for video ${videoId}`);
  
  // Simulate service call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: false,
    error: `${service} service not implemented`,
    retryable: false
  };
}

async function fetchVideoMetadata(videoId: string) {
  console.log(`📊 Fetching metadata for video: ${videoId}`);
  
  try {
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json();
      return {
        title: oembedData.title,
        channel: oembedData.author_name,
        duration: 'Unknown',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };
    }
  } catch (error) {
    console.warn('Failed to fetch video metadata:', error);
  }

  return {
    title: `YouTube Video ${videoId}`,
    channel: 'Unknown',
    duration: 'Unknown',
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  };
}

function generateFallbackContent(videoId: string, metadata: any): string {
  const timestamp = new Date().toISOString();
  
  return `# 🎥 ${metadata.title || `YouTube Video ${videoId}`}

**Channel:** ${metadata.channel || 'Unknown'}
**Duration:** ${metadata.duration || 'Unknown'}
**Import Date:** ${new Date(timestamp).toLocaleDateString()}
**Source:** https://www.youtube.com/watch?v=${videoId}

---

## ⚠️ Transcript Not Available

**Status:** Audio extraction failed

We couldn't fetch the transcript for this video. This could be due to:
- Video is private or restricted
- Captions are disabled
- Audio quality is too poor for transcription
- Video contains primarily music or non-speech content

## 📝 Manual Notes

You can add your own notes about this video here:

*Click to start adding your notes...*

---

**Note:** You can try importing this video again later, or check if the video is publicly available.`;
}
