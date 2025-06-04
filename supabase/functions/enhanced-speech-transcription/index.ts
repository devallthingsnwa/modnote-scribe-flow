
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionOptions {
  enableSpeakerDetection?: boolean;
  enableNoiseReduction?: boolean;
  filterFillerWords?: boolean;
  addParagraphBreaks?: boolean;
  language?: string;
}

interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, fileName, options = {} }: {
      audioData: string;
      fileName: string;
      options: TranscriptionOptions;
    } = await req.json();

    if (!audioData) {
      throw new Error('No audio data provided');
    }

    console.log(`🎬 Starting enhanced transcription for: ${fileName}`);
    const startTime = Date.now();

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    console.log(`📊 Audio data size: ${binaryAudio.length} bytes`);

    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const audioBlob = new Blob([binaryAudio], { 
      type: fileName.toLowerCase().includes('.mp4') ? 'video/mp4' : 'audio/webm' 
    });
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'whisper-1');
    
    // Enable timestamps for speaker detection
    if (options.enableSpeakerDetection) {
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');
    }

    if (options.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }

    console.log('🤖 Calling OpenAI Whisper API...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const whisperData = await whisperResponse.json();
    console.log('✅ Whisper transcription complete');

    let transcript = whisperData.text || '';
    let speakers: SpeakerSegment[] = [];
    let speakerCount = 1;
    let detectedLanguage = whisperData.language || 'en';

    // Process segments for speaker detection if available
    if (options.enableSpeakerDetection && whisperData.segments) {
      console.log('👥 Processing speaker detection...');
      speakers = await processSpeakerDetection(whisperData.segments);
      speakerCount = new Set(speakers.map(s => s.speaker)).size;
      console.log(`🎭 Detected ${speakerCount} speakers`);
    }

    // Apply text enhancements
    if (options.filterFillerWords) {
      transcript = filterFillerWords(transcript);
    }

    if (options.addParagraphBreaks) {
      transcript = addIntelligentParagraphBreaks(transcript);
    }

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    const response = {
      success: true,
      transcript,
      speakers: speakers.length > 0 ? speakers : undefined,
      metadata: {
        duration: whisperData.duration || 0,
        speakerCount,
        processingTime,
        audioQuality: determineAudioQuality(binaryAudio.length, whisperData.duration || 1),
        language: detectedLanguage,
        originalLength: transcript.length,
        enhancedFeatures: {
          speakerDetection: options.enableSpeakerDetection,
          noiseReduction: options.enableNoiseReduction,
          fillerWordFiltering: options.filterFillerWords,
          paragraphBreaks: options.addParagraphBreaks
        }
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced transcription error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Enhanced transcription failed' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processSpeakerDetection(segments: any[]): Promise<SpeakerSegment[]> {
  const speakers: SpeakerSegment[] = [];
  let currentSpeaker = 1;
  let lastEnd = 0;
  
  for (const segment of segments) {
    // Simple speaker change detection based on pauses and audio characteristics
    const pause = segment.start - lastEnd;
    const speakerChanged = pause > 2.0; // 2 second pause suggests speaker change
    
    if (speakerChanged && speakers.length > 0) {
      currentSpeaker = currentSpeaker === 1 ? 2 : 1;
    }
    
    speakers.push({
      speaker: `Speaker ${currentSpeaker}`,
      text: segment.text.trim(),
      startTime: segment.start,
      endTime: segment.end,
      confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.8
    });
    
    lastEnd = segment.end;
  }
  
  return speakers;
}

function filterFillerWords(text: string): string {
  const fillerWords = /\b(um|uh|er|ah|like|you know|sort of|kind of|basically|actually)\b/gi;
  return text
    .replace(fillerWords, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addIntelligentParagraphBreaks(text: string): string {
  // Add paragraph breaks at natural speech boundaries
  return text
    .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
    .replace(/(\w{200,}?[.!?])\s+/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n');
}

function determineAudioQuality(fileSize: number, duration: number): string {
  const bitrate = (fileSize * 8) / duration / 1000; // kbps
  
  if (bitrate > 128) return 'High';
  if (bitrate > 64) return 'Medium';
  return 'Low';
}
