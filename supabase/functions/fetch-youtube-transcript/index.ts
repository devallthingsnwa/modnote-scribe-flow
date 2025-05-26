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
  
  // Try multiple YouTube URL formats
  const urlFormats = [
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://m.youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}`
  ];

  for (const videoUrl of urlFormats) {
    try {
      console.log(`Trying URL format: ${videoUrl}`);
      
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        }
      });
      
      if (!response.ok) {
        console.log(`Failed to fetch ${videoUrl}: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      console.log(`Fetched HTML from ${videoUrl}, length: ${html.length}`);
      
      // Try multiple extraction patterns
      const extractionMethods = [
        () => extractFromYtInitialPlayerResponse(html),
        () => extractFromPlayerResponse(html),
        () => extractFromCaptionTracks(html)
      ];
      
      for (const method of extractionMethods) {
        try {
          const result = await method();
          if (result) {
            console.log("Successfully extracted transcript using method");
            return result;
          }
        } catch (error) {
          console.log("Extraction method failed:", error);
          continue;
        }
      }
      
    } catch (error) {
      console.log(`Error with URL ${videoUrl}:`, error);
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
    /"ytInitialPlayerResponse"\s*:\s*({.+?})\s*;/,
    /var ytInitialPlayerResponse = ({.+?});/,
    /window\["ytInitialPlayerResponse"\] = ({.+?});/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const playerResponse = JSON.parse(match[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          return await processCaptionTracks(captionTracks);
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

async function extractFromPlayerResponse(html: string) {
  // Look for embedded player response in script tags
  const scriptRegex = /<script[^>]*>(.*?ytInitialPlayerResponse.*?)<\/script>/gs;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const scriptContent = match[1];
      const playerMatch = scriptContent.match(/ytInitialPlayerResponse["']?\s*[:=]\s*({.+?})/);
      
      if (playerMatch) {
        const playerResponse = JSON.parse(playerMatch[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          return await processCaptionTracks(captionTracks);
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function extractFromCaptionTracks(html: string) {
  // Direct search for caption track URLs
  const captionUrlRegex = /"baseUrl":"([^"]*\/api\/timedtext[^"]*)"/g;
  const urls = [];
  let match;
  
  while ((match = captionUrlRegex.exec(html)) !== null) {
    urls.push(match[1].replace(/\\u0026/g, '&').replace(/\\/g, ''));
  }
  
  if (urls.length > 0) {
    return await fetchFromCaptionUrl(urls[0]);
  }
  
  return null;
}

async function processCaptionTracks(captionTracks: any[]) {
  // Prefer English captions
  let selectedTrack = captionTracks[0];
  
  for (const track of captionTracks) {
    if (track.languageCode === 'en' || 
        track.vssId?.includes('en') || 
        track.name?.simpleText?.toLowerCase().includes('english')) {
      selectedTrack = track;
      break;
    }
  }
  
  if (!selectedTrack.baseUrl) {
    return null;
  }
  
  return await fetchFromCaptionUrl(selectedTrack.baseUrl);
}

async function fetchFromCaptionUrl(baseUrl: string) {
  try {
    let captionUrl = baseUrl;
    
    if (!captionUrl.startsWith('http')) {
      captionUrl = `https://www.youtube.com${captionUrl}`;
    }
    
    // Request WebVTT format
    if (!captionUrl.includes('fmt=')) {
      captionUrl += captionUrl.includes('?') ? '&fmt=vtt' : '?fmt=vtt';
    }
    
    console.log(`Fetching captions from: ${captionUrl}`);
    
    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!captionResponse.ok) {
      throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
    }
    
    const captionContent = await captionResponse.text();
    console.log(`Caption content length: ${captionContent.length}`);
    
    let transcript = [];
    
    if (captionContent.includes('WEBVTT')) {
      transcript = parseWebVTT(captionContent);
    } else if (captionContent.includes('<text')) {
      transcript = parseXML(captionContent);
    } else {
      // Try both parsers
      transcript = parseWebVTT(captionContent);
      if (transcript.length === 0) {
        transcript = parseXML(captionContent);
      }
    }
    
    if (transcript.length === 0) {
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
    
    // Skip empty lines and WebVTT header
    if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) {
      continue;
    }
    
    // Check if line contains timestamp (WebVTT format: 00:00:00.000 --> 00:00:05.000)
    const timestampRegex = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/;
    const timestampMatch = line.match(timestampRegex);
    
    if (timestampMatch) {
      // Save previous cue if exists
      if (currentCue && currentCue.text) {
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
        .replace(/<[^>]*>/g, '') // Remove any HTML tags
        .trim();
      
      currentCue.text += (currentCue.text ? ' ' : '') + cleanText;
    }
  }
  
  // Add the last cue
  if (currentCue && currentCue.text) {
    transcript.push(currentCue);
  }
  
  return transcript;
}

function parseXML(content: string) {
  const transcript = [];
  const textRegex = /<text start="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = textRegex.exec(content)) !== null) {
    const startTime = parseFloat(match[1]);
    const text = match[2]
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
        end: startTime + 5, // Estimate end time
        text: text
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
  const parts = timeString.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
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
