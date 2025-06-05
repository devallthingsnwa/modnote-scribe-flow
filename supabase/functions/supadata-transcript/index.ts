
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
  
  // Step 1: Try YouTube captions API directly
  console.log('📝 Step 1: Attempting direct caption extraction...');
  const captionResult = await extractYouTubeCaptions(videoId, options);
  
  if (captionResult.success && captionResult.transcript) {
    console.log('✅ Direct caption extraction successful');
    return {
      ...captionResult,
      method: 'captions',
      metadata: { ...captionResult.metadata, method: 'captions' }
    };
  }
  
  console.log('⚠️ Caption extraction failed, trying page scraping...');
  
  // Step 2: Try scraping the YouTube page for captions
  console.log('🌐 Step 2: Attempting page scraping for captions...');
  const scrapingResult = await scrapeYouTubePageForCaptions(videoId, options);
  
  if (scrapingResult.success && scrapingResult.transcript) {
    console.log('✅ Page scraping successful');
    return {
      ...scrapingResult,
      method: 'page-scraping',
      metadata: { ...scrapingResult.metadata, method: 'page-scraping' }
    };
  }
  
  console.log('⚠️ Page scraping failed, trying alternative methods...');
  
  // Step 3: Try alternative extraction methods
  console.log('🔄 Step 3: Trying alternative extraction methods...');
  const altResult = await tryAlternativeExtractionMethods(videoId, options);
  
  if (altResult.success && altResult.transcript) {
    console.log('✅ Alternative extraction successful');
    return altResult;
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

async function extractYouTubeCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('📝 Extracting YouTube captions...');
  
  try {
    // Try multiple caption API endpoints
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=tl&fmt=srv3`, // Filipino
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=fil&fmt=srv3`, // Filipino
    ];

    for (const url of captionUrls) {
      try {
        console.log(`Trying caption URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/xml,application/xml,text/plain,*/*',
          }
        });

        if (response.ok) {
          const content = await response.text();
          
          if (content && content.length > 100) {
            const segments = parseXMLCaptions(content);
            
            if (segments.length > 0) {
              const transcript = segments.map(s => s.text).join(' ');
              console.log(`Caption extraction successful: ${transcript.length} characters`);
              
              return {
                success: true,
                transcript,
                segments,
                metadata: await fetchVideoMetadata(videoId)
              };
            }
          }
        }
      } catch (error) {
        console.log(`Caption URL failed: ${url}`, error.message);
      }
    }

    return {
      success: false,
      error: 'No captions available via direct API',
      retryable: true
    };
  } catch (error) {
    console.error('Caption extraction error:', error);
    return {
      success: false,
      error: 'Caption extraction failed',
      retryable: true
    };
  }
}

async function scrapeYouTubePageForCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🌐 Scraping YouTube page for captions...');
  
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Extract player response
    const playerResponseMatch = html.match(/"playerResponse":\s*({.+?})\s*[,}]/);
    if (!playerResponseMatch) {
      console.log("No player response found");
      return { success: false, error: 'No player response found' };
    }

    let playerResponse;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch (e) {
      console.error("Failed to parse player response:", e);
      return { success: false, error: 'Failed to parse player response' };
    }

    // Extract caption tracks
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log("No caption tracks found");
      return { success: false, error: 'No caption tracks found' };
    }

    // Try different language tracks
    const trackPriority = ['en', 'auto', 'tl', 'fil', captionTracks[0]?.languageCode];
    let selectedTrack = null;
    
    for (const lang of trackPriority) {
      selectedTrack = captionTracks.find((track: any) => track.languageCode === lang);
      if (selectedTrack) break;
    }
    
    if (!selectedTrack || !selectedTrack.baseUrl) {
      console.log("No suitable caption track found");
      return { success: false, error: 'No suitable caption track found' };
    }

    // Download caption content
    const captionResponse = await fetch(selectedTrack.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!captionResponse.ok) {
      throw new Error(`Caption download failed: ${captionResponse.status}`);
    }

    const captionXml = await captionResponse.text();
    const segments = parseXMLCaptions(captionXml);
    
    if (segments.length === 0) {
      console.log("No segments extracted from captions");
      return { success: false, error: 'No segments extracted' };
    }

    const transcript = segments.map(s => s.text).join(' ');
    console.log(`Page scraping successful: ${segments.length} segments, ${transcript.length} characters`);

    return {
      success: true,
      transcript,
      segments,
      metadata: await fetchVideoMetadata(videoId)
    };

  } catch (error) {
    console.error("Page scraping failed:", error);
    return { success: false, error: 'Page scraping failed' };
  }
}

async function tryAlternativeExtractionMethods(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🔄 Trying alternative extraction methods...');
  
  // Try multiple approaches for stubborn videos
  const methods = [
    () => extractViaEmbedPage(videoId),
    () => extractViaPlayerAPI(videoId),
    () => extractViaYouTubeJS(videoId)
  ];
  
  for (const method of methods) {
    try {
      const result = await method();
      if (result.success && result.transcript) {
        return result;
      }
    } catch (error) {
      console.log(`Alternative method failed:`, error.message);
    }
  }
  
  return {
    success: false,
    error: 'All alternative methods failed'
  };
}

async function extractViaEmbedPage(videoId: string): Promise<TranscriptResponse> {
  console.log('🔗 Trying embed page extraction...');
  
  try {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      // Look for caption data in embed page
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionMatch) {
        const tracks = JSON.parse(captionMatch[1]);
        if (tracks.length > 0 && tracks[0].baseUrl) {
          const captionResponse = await fetch(tracks[0].baseUrl);
          const captionXml = await captionResponse.text();
          const segments = parseXMLCaptions(captionXml);
          
          if (segments.length > 0) {
            return {
              success: true,
              transcript: segments.map(s => s.text).join(' '),
              segments
            };
          }
        }
      }
    }
  } catch (error) {
    console.log('Embed extraction failed:', error);
  }
  
  return { success: false, error: 'Embed extraction failed' };
}

async function extractViaPlayerAPI(videoId: string): Promise<TranscriptResponse> {
  console.log('🎯 Trying player API extraction...');
  
  try {
    // Try accessing YouTube's internal API
    const apiUrl = `https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20231212.00.00'
          }
        },
        params: Buffer.from(`\n\x0b${videoId}`).toString('base64')
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups) {
        const cueGroups = data.actions[0].updateEngagementPanelAction.content.transcriptRenderer.body.transcriptBodyRenderer.cueGroups;
        const transcript = cueGroups.map((group: any) => 
          group.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer?.cue?.simpleText || ''
        ).filter((text: string) => text.length > 0).join(' ');
        
        if (transcript.length > 50) {
          console.log(`Player API extraction successful: ${transcript.length} characters`);
          return {
            success: true,
            transcript
          };
        }
      }
    }
  } catch (error) {
    console.log('Player API extraction failed:', error);
  }
  
  return { success: false, error: 'Player API extraction failed' };
}

async function extractViaYouTubeJS(videoId: string): Promise<TranscriptResponse> {
  console.log('📜 Trying YouTube JS extraction...');
  
  // This would involve more complex scraping of YouTube's JavaScript
  // For now, return failure as this requires more advanced implementation
  return { success: false, error: 'JS extraction not implemented' };
}

function parseXMLCaptions(xmlContent: string): Array<{start: number, duration: number, text: string}> {
  const segments: Array<{start: number, duration: number, text: string}> = [];
  
  try {
    const textRegex = /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g;
    let match;
    
    while ((match = textRegex.exec(xmlContent)) !== null) {
      const start = parseFloat(match[1] || '0');
      const duration = parseFloat(match[2] || '3');
      const text = decodeXMLEntities(match[3] || '').trim();
      
      if (text && text.length > 0) {
        segments.push({
          start,
          duration,
          text
        });
      }
    }
  } catch (error) {
    console.error("Error parsing XML captions:", error);
  }
  
  return segments;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ');
}

async function fetchTranscriptFromCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  return extractYouTubeCaptions(videoId, options);
}

async function transcribeVideoAudio(videoId: string, options: any): Promise<TranscriptResponse> {
  // Audio transcription would require downloading and processing audio
  // For now, return failure as this requires external services
  return {
    success: false,
    error: 'Audio transcription not implemented',
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
