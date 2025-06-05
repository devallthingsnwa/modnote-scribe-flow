
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
  console.log('🔗 Starting comprehensive transcript extraction...');
  
  // Method 1: Direct caption API with multiple language attempts
  console.log('📝 Step 1: Enhanced caption API extraction...');
  const captionResult = await extractWithDirectCaptionAPI(videoId, options);
  
  if (captionResult.success && captionResult.transcript && captionResult.transcript.length > 50) {
    console.log('✅ Direct caption API successful');
    return {
      ...captionResult,
      method: 'captions',
      metadata: { ...captionResult.metadata, method: 'direct-captions' }
    };
  }
  
  console.log('⚠️ Direct captions failed, trying YouTube page extraction...');
  
  // Method 2: YouTube page scraping with improved parsing
  console.log('🌐 Step 2: YouTube page scraping...');
  const scrapingResult = await extractFromYouTubePage(videoId, options);
  
  if (scrapingResult.success && scrapingResult.transcript && scrapingResult.transcript.length > 50) {
    console.log('✅ YouTube page scraping successful');
    return {
      ...scrapingResult,
      method: 'page-scraping',
      metadata: { ...scrapingResult.metadata, method: 'page-scraping' }
    };
  }
  
  console.log('⚠️ Page scraping failed, trying alternative APIs...');
  
  // Method 3: Alternative extraction methods
  console.log('🔄 Step 3: Alternative extraction methods...');
  const altResult = await tryAlternativeExtractionMethods(videoId, options);
  
  if (altResult.success && altResult.transcript && altResult.transcript.length > 50) {
    console.log('✅ Alternative extraction successful');
    return altResult;
  }
  
  console.log('⚠️ All extraction methods failed, trying embed method...');
  
  // Method 4: Embed page extraction
  console.log('🔗 Step 4: Embed page extraction...');
  const embedResult = await extractFromEmbedPage(videoId, options);
  
  if (embedResult.success && embedResult.transcript && embedResult.transcript.length > 50) {
    console.log('✅ Embed extraction successful');
    return embedResult;
  }
  
  // Final fallback with metadata
  console.log('❌ All extraction methods failed');
  const metadata = await fetchVideoMetadata(videoId);
  
  return {
    success: false,
    error: 'All transcription methods failed. This video may not have captions available.',
    metadata: {
      ...metadata,
      method: 'failed',
      reason: 'No captions available or video is restricted'
    },
    method: 'failed',
    retryable: retryAttempt < 2
  };
}

async function extractWithDirectCaptionAPI(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('📝 Direct caption API extraction...');
  
  try {
    const captionUrls = [
      // Try multiple language codes and formats
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=tl&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=fil&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=vtt`,
      // Alternative timedtext endpoints
      `https://video.google.com/timedtext?lang=en&v=${videoId}`,
      `https://video.google.com/timedtext?lang=auto&v=${videoId}`,
      `https://video.google.com/timedtext?v=${videoId}`,
    ];

    for (const url of captionUrls) {
      try {
        console.log(`Trying caption URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/xml,application/xml,text/plain,*/*',
            'Accept-Language': 'en-US,en;q=0.9,tl;q=0.8,fil;q=0.7',
            'Cache-Control': 'no-cache',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });

        if (response.ok) {
          const content = await response.text();
          console.log(`Response content length: ${content.length}`);
          
          if (content && content.length > 100 && (content.includes('<text') || content.includes('WEBVTT'))) {
            const segments = parseTranscriptContent(content);
            
            if (segments.length > 0) {
              const transcript = segments.map(s => s.text).join(' ').trim();
              console.log(`Caption extraction successful: ${transcript.length} characters, ${segments.length} segments`);
              
              return {
                success: true,
                transcript,
                segments,
                metadata: await fetchVideoMetadata(videoId)
              };
            }
          }
        } else {
          console.log(`Caption URL failed with status: ${response.status}`);
        }
      } catch (error) {
        console.log(`Caption URL error: ${url}`, error.message);
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

async function extractFromYouTubePage(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🌐 YouTube page extraction...');
  
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,tl;q=0.8,fil;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Page content length: ${html.length}`);
    
    // Multiple extraction patterns for player response
    const extractionPatterns = [
      /var ytInitialPlayerResponse = ({.+?});/,
      /window\["ytInitialPlayerResponse"\] = ({.+?});/,
      /"playerResponse":\s*({.+?})\s*[,}]/,
      /ytInitialPlayerResponse"\s*:\s*({.+?})\s*[,}]/,
      /setConfig.*?"playerResponse":\s*({.+?})\s*[,}]/,
    ];

    let playerResponse = null;
    
    for (const pattern of extractionPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          playerResponse = JSON.parse(match[1]);
          console.log('Found player response via pattern');
          break;
        } catch (e) {
          console.log('Failed to parse player response from pattern');
          continue;
        }
      }
    }

    if (!playerResponse) {
      console.log("No player response found in page");
      return { success: false, error: 'No player response found' };
    }

    // Extract caption tracks
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log("No caption tracks found in player response");
      return { success: false, error: 'No caption tracks found' };
    }

    console.log(`Found ${captionTracks.length} caption tracks`);

    // Try multiple language preferences
    const languagePreferences = ['en', 'en-US', 'auto', 'tl', 'fil'];
    let selectedTrack = null;
    
    for (const lang of languagePreferences) {
      selectedTrack = captionTracks.find((track: any) => track.languageCode === lang);
      if (selectedTrack) {
        console.log(`Selected track language: ${lang}`);
        break;
      }
    }
    
    if (!selectedTrack && captionTracks.length > 0) {
      selectedTrack = captionTracks[0];
      console.log(`Using first available track: ${selectedTrack.languageCode}`);
    }
    
    if (!selectedTrack || !selectedTrack.baseUrl) {
      console.log("No suitable caption track found");
      return { success: false, error: 'No suitable caption track found' };
    }

    // Download and parse captions
    let captionUrl = selectedTrack.baseUrl;
    if (!captionUrl.includes('&fmt=')) {
      captionUrl += '&fmt=srv3';
    }
    
    console.log(`Downloading captions from: ${captionUrl}`);
    
    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/xml,application/xml,*/*',
        'Referer': watchUrl
      }
    });

    if (!captionResponse.ok) {
      throw new Error(`Caption download failed: ${captionResponse.status}`);
    }

    const captionXml = await captionResponse.text();
    console.log(`Caption XML length: ${captionXml.length}`);
    
    const segments = parseTranscriptContent(captionXml);
    
    if (segments.length === 0) {
      console.log("No segments extracted from captions");
      return { success: false, error: 'No segments extracted' };
    }

    const transcript = segments.map(s => s.text).join(' ').trim();
    console.log(`Page scraping successful: ${segments.length} segments, ${transcript.length} characters`);

    return {
      success: true,
      transcript,
      segments,
      metadata: await fetchVideoMetadata(videoId)
    };

  } catch (error) {
    console.error("Page scraping failed:", error);
    return { success: false, error: `Page scraping failed: ${error.message}` };
  }
}

async function tryAlternativeExtractionMethods(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🔄 Trying alternative extraction methods...');
  
  // Method 1: YouTube InnerTube API
  try {
    console.log('Trying YouTube InnerTube API...');
    
    const inneTubeResponse = await fetch('https://www.youtube.com/youtubei/v1/get_transcript', {
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
    
    if (inneTubeResponse.ok) {
      const data = await inneTubeResponse.json();
      
      if (data.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups) {
        const cueGroups = data.actions[0].updateEngagementPanelAction.content.transcriptRenderer.body.transcriptBodyRenderer.cueGroups;
        const transcript = cueGroups.map((group: any) => 
          group.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer?.cue?.simpleText || ''
        ).filter((text: string) => text.length > 0).join(' ').trim();
        
        if (transcript.length > 50) {
          console.log(`InnerTube API extraction successful: ${transcript.length} characters`);
          return {
            success: true,
            transcript,
            metadata: await fetchVideoMetadata(videoId)
          };
        }
      }
    }
  } catch (error) {
    console.log('InnerTube API failed:', error.message);
  }
  
  return { success: false, error: 'Alternative methods failed' };
}

async function extractFromEmbedPage(videoId: string, options: any): Promise<TranscriptResponse> {
  console.log('🔗 Embed page extraction...');
  
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
              if (captionResponse.ok) {
                const captionXml = await captionResponse.text();
                const segments = parseTranscriptContent(captionXml);
                
                if (segments.length > 0) {
                  const transcript = segments.map(s => s.text).join(' ').trim();
                  return {
                    success: true,
                    transcript,
                    segments,
                    metadata: await fetchVideoMetadata(videoId)
                  };
                }
              }
            }
          } catch (e) {
            console.log('Failed to parse embed captions');
          }
        }
      }
    }
  } catch (error) {
    console.log('Embed extraction failed:', error);
  }
  
  return { success: false, error: 'Embed extraction failed' };
}

function parseTranscriptContent(content: string): Array<{start: number, duration: number, text: string}> {
  const segments: Array<{start: number, duration: number, text: string}> = [];
  
  try {
    // Handle both XML and VTT formats
    if (content.includes('WEBVTT')) {
      // Parse VTT format
      const lines = content.split('\n');
      let currentTime = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // VTT timestamp format: 00:00:01.000 --> 00:00:04.000
        if (line.includes(' --> ')) {
          const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
          if (timeMatch && i + 1 < lines.length) {
            const startTime = parseVTTTime(timeMatch[1]);
            const endTime = parseVTTTime(timeMatch[2]);
            const text = lines[i + 1].trim();
            
            if (text && text.length > 0) {
              segments.push({
                start: startTime,
                duration: endTime - startTime,
                text: decodeHTMLEntities(text)
              });
            }
            i++; // Skip the text line
          }
        }
      }
    } else {
      // Parse XML format
      const xmlPatterns = [
        /<text start="([^"]*)"(?:\s+dur="([^"]*)")?>([^<]*)<\/text>/g,
        /<p t="([^"]*)"(?:\s+d="([^"]*)")?>([^<]*)<\/p>/g,
        /<subtitle start="([^"]*)"(?:\s+duration="([^"]*)")?>([^<]*)<\/subtitle>/g,
      ];
      
      for (const pattern of xmlPatterns) {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(content)) !== null) {
          const start = parseFloat(match[1] || '0');
          const duration = parseFloat(match[2] || '3');
          const text = decodeHTMLEntities(match[3] || '').trim();
          
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
    }
  } catch (error) {
    console.error("Content parsing error:", error);
  }
  
  return segments.sort((a, b) => a.start - b.start);
}

function parseVTTTime(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  
  return hours * 3600 + minutes * 60 + seconds + (milliseconds / 1000);
}

function decodeHTMLEntities(text: string): string {
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

async function fetchTranscriptFromCaptions(videoId: string, options: any): Promise<TranscriptResponse> {
  return extractWithDirectCaptionAPI(videoId, options);
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
