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
    rawOutput?: boolean;
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
  console.log('🔗 Starting transcript extraction...');
  
  // Enhanced caption extraction
  console.log('📝 Step 1: Caption extraction...');
  const captionResult = await extractYouTubeCaptionsEnhanced(videoId, options);
  
  if (captionResult.success && captionResult.transcript) {
    console.log('✅ Caption extraction successful');
    return {
      ...captionResult,
      method: 'captions',
      metadata: { ...captionResult.metadata, method: 'captions' }
    };
  }
  
  console.log('⚠️ Caption extraction failed, trying page scraping...');
  
  // Enhanced page scraping
  console.log('🌐 Step 2: Page scraping...');
  const scrapingResult = await scrapeYouTubePageEnhanced(videoId, options);
  
  if (scrapingResult.success && scrapingResult.transcript) {
    console.log('✅ Page scraping successful');
    return {
      ...scrapingResult,
      method: 'page-scraping',
      metadata: { ...scrapingResult.metadata, method: 'page-scraping' }
    };
  }
  
  console.log('⚠️ Page scraping failed, trying alternative methods...');
  
  // Alternative extraction approaches
  console.log('🔄 Step 3: Alternative methods...');
  const altResult = await tryMultipleExtractionMethods(videoId, options);
  
  if (altResult.success && altResult.transcript) {
    console.log('✅ Alternative extraction successful');
    return altResult;
  }
  
  // Return failure with metadata
  console.log('❌ All extraction methods failed');
  const metadata = await fetchVideoMetadata(videoId);
  
  return {
    success: false,
    error: 'All transcription methods failed',
    metadata: {
      ...metadata,
      method: 'failed',
      reason: 'All transcription methods failed'
    },
    method: 'failed'
  };
}

async function extractYouTubeCaptionsEnhanced(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('📝 Enhanced YouTube caption extraction...');
  
  try {
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=tl&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=fil&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=vtt`,
    ];

    for (const url of captionUrls) {
      try {
        console.log(`Trying caption URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/xml,application/xml,text/plain,*/*',
            'Accept-Language': 'en-US,en;q=0.9,tl;q=0.8',
            'Cache-Control': 'no-cache',
          }
        });

        if (response.ok) {
          const content = await response.text();
          
          if (content && content.length > 100) {
            const segments = parseXMLCaptionsEnhanced(content);
            
            if (segments.length > 0) {
              // Return only raw spoken words
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
      error: 'No captions available',
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

async function scrapeYouTubePageEnhanced(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🌐 Enhanced YouTube page scraping...');
  
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,tl;q=0.8,fil;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    const extractionPatterns = [
      /"playerResponse":\s*({.+?})\s*[,}]/,
      /"PLAYER_VARS":\s*({.+?})\s*[,}]/,
      /ytInitialPlayerResponse\s*=\s*({.+?});/,
      /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/,
    ];

    let playerResponse = null;
    
    for (const pattern of extractionPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          playerResponse = JSON.parse(match[1]);
          console.log('Found player response');
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!playerResponse) {
      console.log("No player response found");
      return { success: false, error: 'No player response found' };
    }

    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log("No caption tracks found");
      return { success: false, error: 'No caption tracks found' };
    }

    const trackPriority = ['en', 'auto', 'tl', 'fil', 'en-US', 'en-GB'];
    let selectedTrack = null;
    
    for (const lang of trackPriority) {
      selectedTrack = captionTracks.find((track: any) => track.languageCode === lang);
      if (selectedTrack) {
        console.log(`Selected track language: ${lang}`);
        break;
      }
    }
    
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
      console.log(`Using first available track: ${selectedTrack.languageCode}`);
    }
    
    if (!selectedTrack || !selectedTrack.baseUrl) {
      console.log("No suitable caption track found");
      return { success: false, error: 'No suitable caption track found' };
    }

    const captionUrl = selectedTrack.baseUrl.includes('&fmt=') ? selectedTrack.baseUrl : `${selectedTrack.baseUrl}&fmt=srv3`;
    
    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/xml,application/xml,*/*',
      }
    });

    if (!captionResponse.ok) {
      throw new Error(`Caption download failed: ${captionResponse.status}`);
    }

    const captionXml = await captionResponse.text();
    const segments = parseXMLCaptionsEnhanced(captionXml);
    
    if (segments.length === 0) {
      console.log("No segments extracted");
      return { success: false, error: 'No segments extracted' };
    }

    // Return only raw spoken words
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

async function tryMultipleExtractionMethods(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🔄 Trying alternative methods...');
  
  const methods = [
    () => extractViaEmbedPageEnhanced(videoId),
    () => extractViaAlternativeAPIs(videoId),
    () => extractViaDirectTranscriptAPI(videoId),
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

async function extractViaEmbedPageEnhanced(videoId: string): Promise<TranscriptResponse> {
  console.log('🔗 Enhanced embed page extraction...');
  
  try {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const captionPatterns = [
        /"captionTracks":\s*(\[.*?\])/,
        /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*(\[.*?\])/,
      ];
      
      for (const pattern of captionPatterns) {
        const captionMatch = html.match(pattern);
        if (captionMatch) {
          try {
            const tracks = JSON.parse(captionMatch[1]);
            if (tracks.length > 0 && tracks[0].baseUrl) {
              const captionResponse = await fetch(tracks[0].baseUrl);
              const captionXml = await captionResponse.text();
              const segments = parseXMLCaptionsEnhanced(captionXml);
              
              if (segments.length > 0) {
                return {
                  success: true,
                  transcript: segments.map(s => s.text).join(' '),
                  segments
                };
              }
            }
          } catch (e) {
            console.log('Failed to parse embed captions');
          }
        }
      }
    }
  } catch (error) {
    console.log('Enhanced embed extraction failed:', error);
  }
  
  return { success: false, error: 'Enhanced embed extraction failed' };
}

async function extractViaAlternativeAPIs(videoId: string): Promise<TranscriptResponse> {
  console.log('🎯 Alternative API extraction...');
  
  try {
    const apiEndpoints = [
      `https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`,
      `https://youtubetranscript.com/?v=${videoId}`,
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        let response;
        if (endpoint.includes('youtubei')) {
          response = await fetch(endpoint, {
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
              params: btoa(`\n\x0b${videoId}`)
            })
          });
        } else {
          response = await fetch(endpoint, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups) {
            const cueGroups = data.actions[0].updateEngagementPanelAction.content.transcriptRenderer.body.transcriptBodyRenderer.cueGroups;
            const transcript = cueGroups.map((group: any) => 
              group.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer?.cue?.simpleText || ''
            ).filter((text: string) => text.length > 0).join(' ');
            
            if (transcript.length > 50) {
              console.log(`Alternative API extraction successful: ${transcript.length} characters`);
              return {
                success: true,
                transcript
              };
            }
          }
        }
      } catch (error) {
        console.log(`Alternative API ${endpoint} failed:`, error.message);
      }
    }
  } catch (error) {
    console.log('Alternative API extraction failed:', error);
  }
  
  return { success: false, error: 'Alternative API extraction failed' };
}

async function extractViaDirectTranscriptAPI(videoId: string): Promise<TranscriptResponse> {
  console.log('📜 Direct transcript API extraction...');
  
  try {
    const transcriptAPIs = [
      `https://video.google.com/timedtext?lang=en&v=${videoId}`,
      `https://video.google.com/timedtext?lang=auto&v=${videoId}`,
      `https://video.google.com/timedtext?lang=tl&v=${videoId}`,
    ];
    
    for (const apiUrl of transcriptAPIs) {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const xmlContent = await response.text();
          if (xmlContent && xmlContent.length > 100) {
            const segments = parseXMLCaptionsEnhanced(xmlContent);
            if (segments.length > 0) {
              return {
                success: true,
                transcript: segments.map(s => s.text).join(' '),
                segments
              };
            }
          }
        }
      } catch (error) {
        console.log(`Direct API ${apiUrl} failed:`, error.message);
      }
    }
  } catch (error) {
    console.log('Direct transcript API extraction failed:', error);
  }
  
  return { success: false, error: 'Direct transcript API extraction failed' };
}

function parseXMLCaptionsEnhanced(xmlContent: string): Array<{start: number, duration: number, text: string}> {
  const segments: Array<{start: number, duration: number, text: string}> = [];
  
  try {
    const patterns = [
      /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g,
      /<p t="([^"]*)"(?:\s+d="([^"]*)")?>([^<]*)<\/p>/g,
      /<subtitle start="([^"]*)"(?:\s+duration="([^"]*)")?>([^<]*)<\/subtitle>/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(xmlContent)) !== null) {
        const start = parseFloat(match[1] || '0');
        const duration = parseFloat(match[2] || '3');
        const text = decodeXMLEntitiesEnhanced(match[3] || '').trim();
        
        if (text && text.length > 0) {
          segments.push({
            start,
            duration,
            text
          });
        }
      }
      
      if (segments.length > 0) break;
    }
  } catch (error) {
    console.error("XML parsing error:", error);
  }
  
  return segments;
}

function decodeXMLEntitiesEnhanced(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanRawTranscript(transcript: string): string {
  // Clean and preserve raw spoken words only
  return transcript
    .replace(/^\s*#.*$/gm, '') // Remove headings
    .replace(/^\s*\*\*.*?\*\*.*$/gm, '') // Remove bold metadata
    .replace(/^\s*---.*$/gm, '') // Remove separators
    .replace(/^\s*\[.*?\]\s*/g, '[Musika] ') // Standardize music indicators
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

async function fetchTranscriptFromCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  return extractYouTubeCaptionsEnhanced(videoId, options);
}

async function transcribeVideoAudio(videoId: string, options: any): Promise<TranscriptResponse> {
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
