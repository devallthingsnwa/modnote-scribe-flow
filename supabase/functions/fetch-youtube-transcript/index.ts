
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
    
    // Get the YouTube Transcript API key from environment
    const apiKey = Deno.env.get('YOUTUBE_TRANSCRIPT_API_KEY');
    
    if (apiKey) {
      try {
        console.log("Using YouTube Transcript API");
        const apiResponse = await fetch(`https://api.youtubetranscript.io/transcript?video_id=${videoId}`, {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          if (apiData.transcript && Array.isArray(apiData.transcript) && apiData.transcript.length > 0) {
            // Format the transcript with timestamps
            const formattedTranscript = apiData.transcript
              .map((segment: any) => {
                const startTime = formatTime(segment.start || 0);
                const endTime = formatTime((segment.start || 0) + (segment.duration || 0));
                return `[${startTime} - ${endTime}] ${segment.text}`;
              })
              .join("\n");

            console.log(`Successfully extracted ${apiData.transcript.length} transcript segments`);

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
          }
        }
      } catch (error) {
        console.log("YouTube Transcript API failed:", error);
      }
    }
    
    // Enhanced fallback to web scraping with multiple strategies
    return await enhancedWebScraping(videoId);
    
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

async function enhancedWebScraping(videoId: string) {
  console.log("Using enhanced web scraping for video:", videoId);
  
  // Try multiple YouTube URL formats with different user agents
  const attempts = [
    {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    {
      url: `https://m.youtube.com/watch?v=${videoId}`,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    },
    {
      url: `https://youtube.com/watch?v=${videoId}`,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  ];

  for (const attempt of attempts) {
    try {
      console.log(`Trying URL: ${attempt.url} with user agent: ${attempt.userAgent.substring(0, 50)}...`);
      
      const response = await fetch(attempt.url, {
        headers: {
          'User-Agent': attempt.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.log(`Failed to fetch ${attempt.url}: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      console.log(`Fetched HTML from ${attempt.url}, length: ${html.length}`);
      
      // Try enhanced extraction methods
      const extractionMethods = [
        () => extractFromYtInitialPlayerResponse(html),
        () => extractFromPlayerResponse(html),
        () => extractFromCaptionTracks(html),
        () => extractFromScriptTags(html)
      ];
      
      for (const method of extractionMethods) {
        try {
          const result = await method();
          if (result) {
            console.log("Successfully extracted transcript");
            return result;
          }
        } catch (error) {
          console.log("Extraction method failed:", error);
          continue;
        }
      }
      
    } catch (error) {
      console.log(`Error with URL ${attempt.url}:`, error);
      continue;
    }
  }

  // If all methods fail, return appropriate message
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

async function extractFromYtInitialPlayerResponse(html: string) {
  const patterns = [
    /var ytInitialPlayerResponse = ({.+?});/s,
    /"ytInitialPlayerResponse"\s*:\s*({.+?})\s*(?:,|\})/s,
    /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/s,
    /ytInitialPlayerResponse\s*=\s*({.+?});/s
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        console.log("Found ytInitialPlayerResponse pattern");
        let jsonStr = match[1];
        
        // Clean up common issues in JSON
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        
        const playerResponse = JSON.parse(jsonStr);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          console.log(`Found ${captionTracks.length} caption tracks`);
          return await processCaptionTracks(captionTracks);
        }
      } catch (e) {
        console.log("Failed to parse ytInitialPlayerResponse:", e.message);
        continue;
      }
    }
  }
  return null;
}

async function extractFromPlayerResponse(html: string) {
  // Look for embedded player response in script tags with better regex
  const scriptRegex = /<script[^>]*>([^<]*ytInitialPlayerResponse[^<]*)<\/script>/gs;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const scriptContent = match[1];
      const playerMatches = [
        /ytInitialPlayerResponse["']?\s*[:=]\s*({[^;]+})/,
        /"ytInitialPlayerResponse"\s*:\s*({[^}]+})/,
        /ytInitialPlayerResponse\s*=\s*({[^;]+})/
      ];
      
      for (const playerPattern of playerMatches) {
        const playerMatch = scriptContent.match(playerPattern);
        if (playerMatch) {
          try {
            const playerResponse = JSON.parse(playerMatch[1]);
            const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            
            if (captionTracks && captionTracks.length > 0) {
              console.log(`Found ${captionTracks.length} caption tracks in script`);
              return await processCaptionTracks(captionTracks);
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function extractFromCaptionTracks(html: string) {
  // Enhanced direct search for caption track URLs
  const captionUrlPatterns = [
    /"baseUrl":"([^"]*\/api\/timedtext[^"]*)"/g,
    /'baseUrl':'([^']*\/api\/timedtext[^']*)'/g,
    /baseUrl["']?\s*:\s*["']([^"']*\/api\/timedtext[^"']*)/g
  ];
  
  const urls = new Set();
  
  for (const pattern of captionUrlPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      urls.add(url);
    }
  }
  
  console.log(`Found ${urls.size} potential caption URLs`);
  
  for (const url of urls) {
    try {
      const result = await fetchFromCaptionUrl(url as string);
      if (result) return result;
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

async function extractFromScriptTags(html: string) {
  // Extract all script tags and look for caption data
  const scriptTagRegex = /<script[^>]*>([^<]+)<\/script>/gs;
  let match;
  
  while ((match = scriptTagRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    
    // Look for timedtext URLs in any script content
    const timedtextRegex = /(https?:\/\/[^"'\s]*\/api\/timedtext[^"'\s]*)/g;
    let urlMatch;
    
    while ((urlMatch = timedtextRegex.exec(scriptContent)) !== null) {
      try {
        const url = urlMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
        console.log(`Found timedtext URL in script: ${url}`);
        const result = await fetchFromCaptionUrl(url);
        if (result) return result;
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
}

async function processCaptionTracks(captionTracks: any[]) {
  // Prefer English captions, then auto-generated, then any available
  const priorities = [
    (track: any) => track.languageCode === 'en' && !track.vssId?.includes('.'),
    (track: any) => track.languageCode === 'en',
    (track: any) => track.vssId?.includes('en'),
    (track: any) => track.name?.simpleText?.toLowerCase().includes('english'),
    (track: any) => !track.vssId?.includes('.'), // Non-auto-generated
    () => true // Any track
  ];
  
  for (const priorityFilter of priorities) {
    const filteredTracks = captionTracks.filter(priorityFilter);
    if (filteredTracks.length > 0) {
      console.log(`Trying ${filteredTracks.length} tracks with current priority`);
      for (const track of filteredTracks) {
        if (track.baseUrl) {
          const result = await fetchFromCaptionUrl(track.baseUrl);
          if (result) return result;
        }
      }
    }
  }
  
  return null;
}

async function fetchFromCaptionUrl(baseUrl: string) {
  try {
    let captionUrl = baseUrl;
    
    if (!captionUrl.startsWith('http')) {
      captionUrl = `https://www.youtube.com${captionUrl}`;
    }
    
    // Ensure we request WebVTT format
    const url = new URL(captionUrl);
    url.searchParams.set('fmt', 'vtt');
    url.searchParams.set('tlang', 'en');
    
    console.log(`Fetching captions from: ${url.toString()}`);
    
    const captionResponse = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/vtt,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    if (!captionResponse.ok) {
      console.log(`Caption fetch failed: ${captionResponse.status}`);
      return null;
    }
    
    const captionContent = await captionResponse.text();
    console.log(`Caption content length: ${captionContent.length}`);
    
    if (!captionContent || captionContent.length < 50) {
      console.log("Caption content too short or empty");
      return null;
    }
    
    let transcript = [];
    
    // Enhanced parsing for WebVTT format
    if (captionContent.includes('WEBVTT') || captionContent.includes('-->')) {
      transcript = parseWebVTT(captionContent);
    } else if (captionContent.includes('<text')) {
      transcript = parseXML(captionContent);
    } else {
      // Try to parse as plain text with timestamps
      transcript = parseTimestampedText(captionContent);
    }
    
    if (transcript.length === 0) {
      console.log("No transcript segments extracted");
      return null;
    }
    
    const formattedTranscript = transcript
      .map((entry) => {
        const startTime = formatTimeWithMilliseconds(entry.start);
        const endTime = formatTimeWithMilliseconds(entry.end);
        return `[${startTime} - ${endTime}] ${entry.text}`;
      })
      .join("\n");

    console.log(`Successfully extracted ${transcript.length} transcript segments`);
    
    return new Response(
      JSON.stringify({ 
        transcript: formattedTranscript,
        metadata: {
          segments: transcript.length,
          duration: transcript.length > 0 ? transcript[transcript.length - 1].end : 0,
          hasTimestamps: true,
          source: 'web-scraping'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Caption URL fetch failed:", error);
    return null;
  }
}

function parseWebVTT(content: string) {
  const transcript = [];
  const lines = content.split('\n');
  let currentCue = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, WebVTT header, and metadata
    if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:') || line.startsWith('NOTE')) {
      continue;
    }
    
    // Enhanced timestamp detection for WebVTT
    const timestampPatterns = [
      /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/,
      /^(\d{1,2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}\.\d{3})/,
      /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/
    ];
    
    let timestampMatch = null;
    for (const pattern of timestampPatterns) {
      timestampMatch = line.match(pattern);
      if (timestampMatch) break;
    }
    
    if (timestampMatch) {
      // Save previous cue if exists
      if (currentCue && currentCue.text.trim()) {
        transcript.push(currentCue);
      }
      
      // Start new cue
      currentCue = {
        start: parseWebVTTTime(timestampMatch[1]),
        end: parseWebVTTTime(timestampMatch[2]),
        text: ''
      };
    } else if (currentCue && line) {
      // Clean and process text
      let cleanText = line
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\{[^}]*\}/g, '') // Remove WebVTT styling
        .trim();
      
      if (cleanText) {
        currentCue.text += (currentCue.text ? ' ' : '') + cleanText;
      }
    }
  }
  
  // Add the last cue
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
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
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

function parseTimestampedText(content: string) {
  const transcript = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Try to extract timestamps from various formats
    const timestampPattern = /(\d{1,2}:\d{2}(?:\.\d{3})?)\s*-\s*(\d{1,2}:\d{2}(?:\.\d{3})?)\s*(.+)/;
    const match = line.match(timestampPattern);
    
    if (match) {
      transcript.push({
        start: parseSimpleTime(match[1]),
        end: parseSimpleTime(match[2]),
        text: match[3].trim()
      });
    }
  }
  
  return transcript;
}

// Helper function to format time for YouTube Transcript API response
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Enhanced helper function to parse WebVTT time format with milliseconds
function parseWebVTTTime(timeString: string): number {
  // Handle both comma and dot as decimal separator
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
  } else {
    seconds = parseFloat(timeString);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
}

function parseSimpleTime(timeString: string): number {
  const parts = timeString.split(':');
  const minutes = parseInt(parts[0], 10);
  const seconds = parseFloat(parts[1] || '0');
  return minutes * 60 + seconds;
}

// Enhanced helper function to format time with milliseconds
function formatTimeWithMilliseconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (ms > 0) {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
