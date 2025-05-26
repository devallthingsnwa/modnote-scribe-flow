
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Video ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Fetching transcript for video: ${videoId}`);
    
    // Try YouTube Transcript API first
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    
    if (apiKey) {
      console.log("Attempting YouTube Transcript API...");
      try {
        const apiResponse = await fetch(`https://api.youtubetranscript.io/transcript?video_id=${videoId}`, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Lovable-App/1.0'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        console.log(`API Response status: ${apiResponse.status}`);

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log("API Response received:", JSON.stringify(apiData).substring(0, 200));
          
          if (apiData.transcript && Array.isArray(apiData.transcript) && apiData.transcript.length > 0) {
            // Format the transcript with timestamps
            const formattedTranscript = apiData.transcript
              .map((segment: any) => {
                const startTime = formatTime(segment.start || 0);
                const endTime = formatTime((segment.start || 0) + (segment.duration || 0));
                return `[${startTime} - ${endTime}] ${segment.text}`;
              })
              .join("\n");

            console.log(`Successfully extracted ${apiData.transcript.length} transcript segments via API`);

            return new Response(
              JSON.stringify({ 
                transcript: formattedTranscript,
                metadata: {
                  segments: apiData.transcript.length,
                  duration: apiData.transcript[apiData.transcript.length - 1]?.start + apiData.transcript[apiData.transcript.length - 1]?.duration || 0,
                  hasTimestamps: true,
                  source: 'youtube-transcript-api'
                }
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            console.log("API returned empty or invalid transcript data");
          }
        } else {
          const errorText = await apiResponse.text();
          console.log(`API Error Response: ${errorText}`);
        }
      } catch (error) {
        console.log("YouTube Transcript API failed:", error.message);
      }
    } else {
      console.log("No YouTube Transcript API key found, skipping API method");
    }
    
    // Enhanced fallback methods
    console.log("Trying fallback transcript extraction methods...");
    return await tryFallbackMethods(videoId);
    
  } catch (error) {
    console.error("Error in fetch-youtube-transcript function:", error);
    
    return new Response(
      JSON.stringify({ 
        transcript: "Unable to fetch transcript for this video. The video may not have captions available or may be restricted.",
        error: error.message
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function tryFallbackMethods(videoId: string) {
  // Method 1: Try direct YouTube transcript extraction
  try {
    console.log("Trying direct YouTube transcript extraction...");
    const result = await extractFromYouTubeDirectly(videoId);
    if (result) return result;
  } catch (error) {
    console.log("Direct extraction failed:", error.message);
  }

  // Method 2: Try alternative transcript services
  try {
    console.log("Trying alternative transcript services...");
    const result = await tryAlternativeServices(videoId);
    if (result) return result;
  } catch (error) {
    console.log("Alternative services failed:", error.message);
  }

  // Method 3: Enhanced web scraping
  console.log("Falling back to enhanced web scraping...");
  return await enhancedWebScraping(videoId);
}

async function extractFromYouTubeDirectly(videoId: string) {
  // Try to use YouTube's internal API endpoints
  const endpoints = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&asr_langs=en&caps=asr&exp=xfm&fmt=vtt`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/vtt,text/plain,*/*',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`
        }
      });

      if (response.ok) {
        const content = await response.text();
        if (content && content.length > 100 && !content.includes('error')) {
          console.log(`Success with endpoint: ${endpoint}`);
          return await processTranscriptContent(content, 'youtube-direct');
        }
      }
    } catch (error) {
      console.log(`Endpoint ${endpoint} failed:`, error.message);
    }
  }

  return null;
}

async function tryAlternativeServices(videoId: string) {
  // Try youtube-transcript npm package approach via different endpoints
  const alternativeEndpoints = [
    `https://youtubetranscript.com/api/transcript?video_id=${videoId}`,
    `https://transcript.rephrase.ai/api/youtube?video_id=${videoId}`,
  ];

  for (const endpoint of alternativeEndpoints) {
    try {
      console.log(`Trying alternative service: ${endpoint}`);
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TranscriptBot/1.0)',
          'Accept': 'application/json,text/plain'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data && (data.transcript || data.text || data.captions)) {
          console.log(`Success with alternative service: ${endpoint}`);
          const transcript = data.transcript || data.text || data.captions;
          return await processTranscriptContent(transcript, 'alternative-service');
        }
      }
    } catch (error) {
      console.log(`Alternative service ${endpoint} failed:`, error.message);
    }
  }

  return null;
}

async function enhancedWebScraping(videoId: string) {
  console.log("Using enhanced web scraping for video:", videoId);
  
  const attempts = [
    {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    {
      url: `https://m.youtube.com/watch?v=${videoId}`,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    }
  ];

  for (const attempt of attempts) {
    try {
      console.log(`Scraping: ${attempt.url}`);
      
      const response = await fetch(attempt.url, {
        headers: {
          'User-Agent': attempt.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      console.log(`Fetched HTML, length: ${html.length}`);
      
      // Enhanced caption URL extraction
      const captionUrls = extractCaptionUrls(html);
      console.log(`Found ${captionUrls.length} caption URLs`);
      
      for (const url of captionUrls) {
        try {
          const result = await fetchFromCaptionUrl(url);
          if (result) return result;
        } catch (e) {
          console.log(`Caption URL failed: ${e.message}`);
        }
      }
      
    } catch (error) {
      console.log(`Scraping attempt failed: ${error.message}`);
    }
  }

  return new Response(
    JSON.stringify({ 
      transcript: "No transcript available for this video. The video may not have captions enabled or may be restricted.",
      error: "All extraction methods failed"
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function extractCaptionUrls(html: string): string[] {
  const urls = new Set<string>();
  
  // Multiple patterns to find caption URLs
  const patterns = [
    /"baseUrl":"([^"]*api\/timedtext[^"]*)"/g,
    /'baseUrl':'([^']*api\/timedtext[^']*)'/g,
    /baseUrl["']?\s*:\s*["']([^"']*api\/timedtext[^"']*)/g,
    /"url":"([^"]*api\/timedtext[^"]*)"/g,
    /captionTracks.*?"baseUrl":"([^"]*)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1];
      if (url) {
        url = url.replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\/g, '');
        if (url.includes('timedtext')) {
          urls.add(url);
        }
      }
    }
  }
  
  return Array.from(urls);
}

async function fetchFromCaptionUrl(baseUrl: string) {
  try {
    let captionUrl = baseUrl;
    
    if (!captionUrl.startsWith('http')) {
      captionUrl = `https://www.youtube.com${captionUrl}`;
    }
    
    // Ensure we request VTT format
    const url = new URL(captionUrl);
    url.searchParams.set('fmt', 'vtt');
    url.searchParams.set('tlang', 'en');
    
    console.log(`Fetching captions from: ${url.toString().substring(0, 100)}...`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/vtt,text/plain,*/*'
      }
    });
    
    if (!response.ok) return null;
    
    const content = await response.text();
    if (!content || content.length < 50) return null;
    
    return await processTranscriptContent(content, 'web-scraping');
    
  } catch (error) {
    console.error("Caption URL fetch failed:", error);
    return null;
  }
}

async function processTranscriptContent(content: string, source: string) {
  try {
    let transcript = [];
    
    if (content.includes('WEBVTT') || content.includes('-->')) {
      transcript = parseWebVTT(content);
    } else if (content.includes('<text')) {
      transcript = parseXML(content);
    } else if (typeof content === 'string' && content.length > 0) {
      // Try to parse as simple text
      transcript = parseSimpleText(content);
    }
    
    if (transcript.length === 0) {
      console.log("No transcript segments extracted from content");
      return null;
    }
    
    const formattedTranscript = transcript
      .map((entry) => {
        const startTime = formatTimeWithMilliseconds(entry.start);
        const endTime = formatTimeWithMilliseconds(entry.end);
        return `[${startTime} - ${endTime}] ${entry.text}`;
      })
      .join("\n");

    console.log(`Successfully extracted ${transcript.length} transcript segments via ${source}`);
    
    return new Response(
      JSON.stringify({ 
        transcript: formattedTranscript,
        metadata: {
          segments: transcript.length,
          duration: transcript.length > 0 ? transcript[transcript.length - 1].end : 0,
          hasTimestamps: true,
          source: source
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Error processing transcript content:", error);
    return null;
  }
}

function parseWebVTT(content: string) {
  const transcript = [];
  const lines = content.split('\n');
  let currentCue = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) {
      continue;
    }
    
    const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/);
    
    if (timestampMatch) {
      if (currentCue && currentCue.text.trim()) {
        transcript.push(currentCue);
      }
      
      currentCue = {
        start: parseWebVTTTime(timestampMatch[1]),
        end: parseWebVTTTime(timestampMatch[2]),
        text: ''
      };
    } else if (currentCue && line) {
      let cleanText = line
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]*>/g, '')
        .replace(/\{[^}]*\}/g, '')
        .trim();
      
      if (cleanText) {
        currentCue.text += (currentCue.text ? ' ' : '') + cleanText;
      }
    }
  }
  
  if (currentCue && currentCue.text.trim()) {
    transcript.push(currentCue);
  }
  
  return transcript.filter(entry => entry.text && entry.text.trim().length > 0);
}

function parseXML(content: string) {
  const transcript = [];
  const textRegex = /<text start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = textRegex.exec(content)) !== null) {
    const startTime = parseFloat(match[1]);
    const duration = parseFloat(match[2]) || 5;
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    
    if (text) {
      transcript.push({
        start: startTime,
        end: startTime + duration,
        text: text
      });
    }
  }
  
  return transcript;
}

function parseSimpleText(content: string) {
  const transcript = [];
  const lines = content.split('\n');
  let timeOffset = 0;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.startsWith('WEBVTT') && cleanLine.length > 5) {
      transcript.push({
        start: timeOffset,
        end: timeOffset + 5, // 5 second segments
        text: cleanLine
      });
      timeOffset += 5;
    }
  }
  
  return transcript;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseWebVTTTime(timeString: string): number {
  timeString = timeString.replace(',', '.');
  const parts = timeString.split(':');
  let hours = 0, minutes = 0, seconds = 0;
  
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTimeWithMilliseconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (ms > 0) {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
