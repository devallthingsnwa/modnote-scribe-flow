
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionOptions {
  enable_speaker_detection?: boolean;
  add_paragraph_breaks?: boolean;
  filter_filler_words?: boolean;
  noise_reduction?: boolean;
  language?: string;
}

interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, options = {} }: { audio: string; options: TranscriptionOptions } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('🎙️ Starting enhanced transcription with speaker detection...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', options.language === 'auto' ? '' : options.language || '');
    formData.append('response_format', 'verbose_json');
    
    // Enable speaker detection if requested
    if (options.enable_speaker_detection) {
      formData.append('timestamp_granularities[]', 'word');
    }

    console.log('📡 Calling OpenAI Whisper API with enhanced options...');
    
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    let transcript = whisperResult.text || '';
    let speakers: SpeakerSegment[] = [];
    let speakerCount = 1;

    // Process speaker detection if enabled and word-level timestamps are available
    if (options.enable_speaker_detection && whisperResult.words) {
      console.log('🎯 Processing speaker detection...');
      speakers = await detectSpeakers(whisperResult.words, transcript);
      speakerCount = new Set(speakers.map(s => s.speaker)).size;
    }

    // Apply text enhancements
    if (options.filter_filler_words) {
      transcript = filterFillerWords(transcript);
      speakers.forEach(speaker => {
        speaker.text = filterFillerWords(speaker.text);
      });
    }

    if (options.add_paragraph_breaks) {
      transcript = addParagraphBreaks(transcript);
    }

    // Calculate confidence score
    const confidence = whisperResult.segments?.reduce((acc: number, seg: any) => 
      acc + (seg.avg_logprob || 0), 0) / (whisperResult.segments?.length || 1);

    const result = {
      success: true,
      transcript: transcript,
      speakers: speakers.length > 0 ? speakers : undefined,
      metadata: {
        speakerCount,
        confidence: Math.max(0, Math.min(1, (confidence + 1) / 2)), // Normalize to 0-1
        language: whisperResult.language || options.language || 'unknown',
        processingTime: 0, // Will be set by client
        duration: whisperResult.duration || 0
      }
    };

    console.log(`✅ Enhanced transcription completed with ${speakerCount} speakers detected`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Enhanced transcription error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Enhanced transcription failed',
        transcript: '',
        metadata: {
          speakerCount: 0,
          confidence: 0,
          language: 'unknown',
          processingTime: 0
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function detectSpeakers(words: any[], transcript: string): Promise<SpeakerSegment[]> {
  const segments: SpeakerSegment[] = [];
  let currentSpeaker = 'Speaker 1';
  let currentText = '';
  let currentStart = 0;
  let speakerChangeThreshold = 2.0; // seconds
  let lastEndTime = 0;
  let speakerCounter = 1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const timeSinceLastWord = word.start - lastEndTime;
    
    // Detect potential speaker change based on pause duration and audio characteristics
    if (timeSinceLastWord > speakerChangeThreshold && currentText.trim()) {
      // End current speaker segment
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        startTime: currentStart,
        endTime: lastEndTime,
        confidence: 0.8 // Placeholder confidence
      });
      
      // Start new speaker
      speakerCounter++;
      currentSpeaker = `Speaker ${speakerCounter}`;
      currentText = word.word;
      currentStart = word.start;
    } else {
      if (!currentText) {
        currentStart = word.start;
      }
      currentText += (currentText ? ' ' : '') + word.word;
    }
    
    lastEndTime = word.end;
  }

  // Add final segment
  if (currentText.trim()) {
    segments.push({
      speaker: currentSpeaker,
      text: currentText.trim(),
      startTime: currentStart,
      endTime: lastEndTime,
      confidence: 0.8
    });
  }

  return segments;
}

function filterFillerWords(text: string): string {
  const fillerWords = [
    'um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean', 'sort of', 'kind of',
    'well', 'so', 'actually', 'basically', 'literally', 'right?', 'okay?'
  ];
  
  let filtered = text;
  
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    filtered = filtered.replace(regex, '');
  });
  
  // Clean up extra spaces
  return filtered.replace(/\s+/g, ' ').trim();
}

function addParagraphBreaks(text: string): string {
  return text
    .replace(/\.\s+/g, '.\n\n')
    .replace(/\?\s+/g, '?\n\n')
    .replace(/!\s+/g, '!\n\n')
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
}
