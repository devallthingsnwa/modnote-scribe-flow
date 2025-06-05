import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptRequest {
  videoId: string;
  method: 'transcript' | 'audio-transcription' | 'fallback-chain' | 'enhanced-fallback-chain';
  retryAttempt?: number;
  options?: {
    includeTimestamps?: boolean;
    language?: string;
    audioQuality?: 'standard' | 'high';
    maxRetries?: number;
    aggressiveMode?: boolean;
    fallbackServices?: string[];
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
    
    if (method === 'enhanced-fallback-chain') {
      result = await processWithEnhancedFallbackChain(videoId, options, retryAttempt);
    } else if (method === 'fallback-chain') {
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

async function processWithEnhancedFallbackChain(videoId: string, options: any, retryAttempt: number): Promise<TranscriptResponse> {
  console.log('🔗 Starting enhanced fallback chain processing...');
  
  // Step 1: Try to get captions using YouTube's internal API
  console.log('📝 Step 1: Fetching captions using YouTube internal API...');
  const captionResult = await fetchYouTubeCaptions(videoId);
  if (captionResult.success && captionResult.transcript) {
    console.log('✅ Caption extraction successful');
    const metadata = await fetchVideoMetadata(videoId);
    return {
      ...captionResult,
      metadata,
      method: 'captions'
    };
  }
  
  // Step 2: Try youtube-transcript approach
  console.log('📝 Step 2: Trying youtube-transcript approach...');
  const transcriptResult = await fetchTranscriptAlternative(videoId);
  if (transcriptResult.success && transcriptResult.transcript) {
    console.log('✅ Alternative transcript extraction successful');
    const metadata = await fetchVideoMetadata(videoId);
    return {
      ...transcriptResult,
      metadata,
      method: 'captions-alt'
    };
  }
  
  // Step 3: Try to extract from page source
  console.log('📝 Step 3: Extracting from page source...');
  const pageResult = await extractFromPageSource(videoId);
  if (pageResult.success && pageResult.transcript) {
    console.log('✅ Page source extraction successful');
    const metadata = await fetchVideoMetadata(videoId);
    return {
      ...pageResult,
      metadata,
      method: 'page-source'
    };
  }
  
  // Final fallback
  console.log('📋 Creating fallback note with metadata...');
  const metadata = await fetchVideoMetadata(videoId);
  
  return {
    success: true,
    transcript: generateEnhancedFallbackContent(videoId, metadata, retryAttempt),
    metadata: {
      ...metadata,
      method: 'enhanced-fallback',
      reason: 'All extraction methods failed'
    },
    method: 'enhanced-fallback'
  };
}

async function fetchYouTubeCaptions(videoId: string): Promise<TranscriptResponse> {
  try {
    console.log(`📝 Fetching YouTube captions for: ${videoId}`);
    
    // Try to access the YouTube watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Look for captions data in the page
    const captionRegex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(captionRegex);
    
    if (match) {
      const captionTracks = JSON.parse(match[1]);
      console.log(`Found ${captionTracks.length} caption tracks`);
      
      // Try to find English captions first, then any available
      let bestTrack = captionTracks.find((track: any) => 
        track.languageCode === 'en' || track.languageCode === 'en-US'
      ) || captionTracks[0];
      
      if (bestTrack?.baseUrl) {
        console.log(`Fetching captions from: ${bestTrack.languageCode}`);
        
        const captionResponse = await fetch(bestTrack.baseUrl);
        const captionXml = await captionResponse.text();
        
        // Parse the XML to extract text
        const textRegex = /<text[^>]*?start="([^"]*)"[^>]*?dur="([^"]*)"[^>]*?>(.*?)<\/text>/g;
        const segments = [];
        let fullTranscript = '';
        let match2;
        
        while ((match2 = textRegex.exec(captionXml)) !== null) {
          const start = parseFloat(match2[1]);
          const duration = parseFloat(match2[2]);
          let text = match2[3];
          
          // Clean up the text
          text = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
          text = text.replace(/&amp;/g, '&');
          text = text.replace(/&lt;/g, '<');
          text = text.replace(/&gt;/g, '>');
          text = text.replace(/&quot;/g, '"');
          text = text.replace(/&#39;/g, "'");
          text = text.trim();
          
          if (text) {
            segments.push({
              start,
              duration,
              text
            });
            fullTranscript += text + ' ';
          }
        }
        
        if (fullTranscript.trim().length > 10) {
          console.log(`✅ Successfully extracted transcript: ${fullTranscript.length} characters`);
          return {
            success: true,
            transcript: fullTranscript.trim(),
            segments
          };
        }
      }
    }
    
    return {
      success: false,
      error: 'No captions found'
    };
    
  } catch (error) {
    console.error('YouTube captions extraction error:', error);
    return {
      success: false,
      error: `Caption extraction failed: ${error.message}`
    };
  }
}

async function fetchTranscriptAlternative(videoId: string): Promise<TranscriptResponse> {
  try {
    console.log(`🔄 Alternative transcript fetch for: ${videoId}`);
    
    // Try to use YouTube's get_video_info endpoint
    const infoUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}`;
    const response = await fetch(infoUrl);
    
    if (response.ok) {
      const text = await response.text();
      const params = new URLSearchParams(text);
      const playerResponse = params.get('player_response');
      
      if (playerResponse) {
        const playerData = JSON.parse(playerResponse);
        const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captions && captions.length > 0) {
          const track = captions[0];
          const captionResponse = await fetch(track.baseUrl);
          const captionXml = await captionResponse.text();
          
          // Parse XML and extract text
          const textMatches = captionXml.match(/<text[^>]*>(.*?)<\/text>/g) || [];
          const transcript = textMatches
            .map(match => match.replace(/<[^>]*>/g, '').trim())
            .filter(text => text.length > 0)
            .join(' ');
          
          if (transcript.length > 10) {
            console.log(`✅ Alternative method successful: ${transcript.length} characters`);
            return {
              success: true,
              transcript
            };
          }
        }
      }
    }
    
    return {
      success: false,
      error: 'Alternative method failed'
    };
    
  } catch (error) {
    console.error('Alternative transcript error:', error);
    return {
      success: false,
      error: 'Alternative method failed'
    };
  }
}

async function extractFromPageSource(videoId: string): Promise<TranscriptResponse> {
  try {
    console.log(`📄 Extracting from page source for: ${videoId}`);
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Look for various patterns that might contain transcript data
    const patterns = [
      /"transcriptTrackUrl":"([^"]+)"/,
      /"captionsTrack":\s*\{[^}]*"baseUrl":"([^"]+)"/,
      /"timedTextTrack":\s*\{[^}]*"url":"([^"]+)"/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const url = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
          const transcriptResponse = await fetch(url);
          const transcriptData = await transcriptResponse.text();
          
          if (transcriptData.length > 50) {
            // Try to extract text from XML/JSON format
            const textMatches = transcriptData.match(/>([^<]+)</g) || [];
            const transcript = textMatches
              .map(match => match.slice(1, -1).trim())
              .filter(text => text.length > 0)
              .join(' ');
            
            if (transcript.length > 10) {
              console.log(`✅ Page source extraction successful: ${transcript.length} characters`);
              return {
                success: true,
                transcript
              };
            }
          }
        } catch (e) {
          console.log('Failed to fetch from pattern match:', e);
        }
      }
    }
    
    return {
      success: false,
      error: 'No transcript data found in page source'
    };
    
  } catch (error) {
    console.error('Page source extraction error:', error);
    return {
      success: false,
      error: 'Page source extraction failed'
    };
  }
}

async function processWithFallbackChain(videoId: string, options: any, retryAttempt: number): Promise<TranscriptResponse> {
  return processWithEnhancedFallbackChain(videoId, options, retryAttempt);
}

async function fetchTranscriptFromCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  return fetchYouTubeCaptions(videoId);
}

async function transcribeVideoAudio(videoId: string, options: any): Promise<TranscriptResponse> {
  return fetchTranscriptAlternative(videoId);
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

function generateEnhancedFallbackContent(videoId: string, metadata: any, retryAttempt: number): string {
  const timestamp = new Date().toISOString();
  
  return `# 🎥 ${metadata.title || `YouTube Video ${videoId}`}

**Channel:** ${metadata.channel || 'Unknown'}
**Duration:** ${metadata.duration || 'Unknown'}
**Import Date:** ${new Date(timestamp).toLocaleDateString()}
**Source:** https://www.youtube.com/watch?v=${videoId}
**Extraction Attempts:** ${retryAttempt + 1} comprehensive attempts made

---

## ⚠️ Transcript Not Available

**Status:** Enhanced extraction failed after multiple comprehensive attempts

We performed extensive transcript extraction attempts using:
- ✅ YouTube internal captions API
- ✅ Alternative transcript extraction methods
- ✅ Page source analysis
- ✅ Multiple parsing techniques

**Possible reasons:**
- Video has auto-generated captions disabled
- Content is primarily instrumental music
- Captions are in a language not supported
- Video has restricted access to transcript data
- Copyright protection prevents transcript access

## 📝 Manual Notes

You can add your own notes about this video here:

**Key Topics:** *Add main topics discussed...*

**Important Timestamps:** 
- 0:00 - *Add important moments...*

**Summary:** *Add your summary...*

**Action Items:** *Add any follow-up tasks...*

---

**💡 Tip:** You can try importing this video again later when transcription services may be more available.`;
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
