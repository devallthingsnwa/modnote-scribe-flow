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
    
    if (!apiKey) {
      console.log("No YouTube Transcript API key found, falling back to web scraping");
      return await fallbackToWebScraping(videoId);
    }

    try {
      // Try using the YouTube Transcript API first
      console.log("Using YouTube Transcript API");
      const apiResponse = await fetch(`https://api.youtubetranscript.io/transcript?video_id=${videoId}`, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log("YouTube Transcript API response:", apiData);
        
        if (apiData.transcript && Array.isArray(apiData.transcript)) {
          // Format the transcript with timestamps
          const formattedTranscript = apiData.transcript
            .map((segment: any) => {
              const startTime = formatTime(segment.start || 0);
              const endTime = formatTime((segment.start || 0) + (segment.duration || 0));
              return `[${startTime} - ${endTime}] ${segment.text}`;
            })
            .join("\n");

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
      
      console.log("YouTube Transcript API failed or returned no data, falling back to web scraping");
    } catch (error) {
      console.log("YouTube Transcript API error:", error, "falling back to web scraping");
    }
    
    // Fallback to web scraping
    return await fallbackToWebScraping(videoId);
    
  } catch (error) {
    console.error("Error in fetch-youtube-transcript function:", error);
    
    return new Response(
      JSON.stringify({ 
        transcript: "Unable to fetch transcript for this video. The video may not have captions available or may be restricted."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fallbackToWebScraping(videoId: string) {
  try {
    console.log("Attempting web scraping fallback for video:", videoId);
    
    // Fetch the YouTube video page with better headers
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Fetched HTML page, length: ${html.length}`);
    
    // Extract caption tracks from ytInitialPlayerResponse
    let captionTracks = null;
    
    const playerResponseRegex = /"ytInitialPlayerResponse"\s*:\s*({.+?})\s*;/;
    const playerResponseMatch = html.match(playerResponseRegex);
    
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        console.log(`Found ${captionTracks?.length || 0} caption tracks in playerResponse`);
      } catch (e) {
        console.log("Error parsing playerResponse:", e);
      }
    }
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log("No caption tracks found");
      return new Response(
        JSON.stringify({ 
          transcript: "No transcript available for this video. The video may not have captions enabled."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get the first available caption track (prefer English if available)
    let selectedTrack = captionTracks[0];
    
    // Try to find English track
    for (const track of captionTracks) {
      if (track.languageCode === 'en' || track.vssId?.includes('en')) {
        selectedTrack = track;
        break;
      }
    }
    
    console.log(`Selected caption track:`, selectedTrack);
    
    let captionUrl = selectedTrack.baseUrl;
    
    // Ensure the URL is properly formatted
    if (!captionUrl.startsWith('http')) {
      captionUrl = `https://www.youtube.com${captionUrl}`;
    }
    
    // Request WebVTT format specifically for better metadata
    if (!captionUrl.includes('fmt=')) {
      captionUrl += captionUrl.includes('?') ? '&fmt=vtt' : '?fmt=vtt';
    } else {
      // Replace any existing format with vtt
      captionUrl = captionUrl.replace(/fmt=[^&]+/, 'fmt=vtt');
    }
    
    console.log(`Fetching WebVTT captions from: ${captionUrl}`);
    
    // Fetch the caption content in WebVTT format
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
    console.log(`Caption content preview: ${captionContent.substring(0, 200)}`);
    
    // Parse WebVTT format with enhanced speaker detection
    let transcript = [];
    
    if (captionContent.includes('WEBVTT')) {
      // Parse WebVTT format
      const lines = captionContent.split('\n');
      let currentCue = null;
      let speakerDetection = detectSpeakerPattern(captionContent);
      
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
            text: '',
            speaker: null
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
          
          // Enhanced speaker detection
          const speaker = detectSpeaker(cleanText, speakerDetection);
          if (speaker) {
            currentCue.speaker = speaker.name;
            cleanText = speaker.text;
          }
          
          currentCue.text += (currentCue.text ? ' ' : '') + cleanText;
        }
      }
      
      // Add the last cue
      if (currentCue && currentCue.text) {
        transcript.push(currentCue);
      }
    } else {
      // Fallback to XML parsing if not WebVTT
      const textRegex = /<text start="([^"]*)"[^>]*>([^<]*)<\/text>/g;
      let match;
      
      while ((match = textRegex.exec(captionContent)) !== null) {
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
            text: text,
            speaker: null
          });
        }
      }
    }
    
    if (transcript.length === 0) {
      return new Response(
        JSON.stringify({ 
          transcript: "No transcript content found in the video captions."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Format transcript with enhanced metadata including speakers
    const formattedTranscript = transcript
      .map((entry) => {
        const startTime = formatTimeWithMilliseconds(entry.start);
        const endTime = formatTimeWithMilliseconds(entry.end);
        
        if (entry.speaker) {
          return `[${startTime} - ${endTime}] ${entry.speaker}: ${entry.text}`;
        } else {
          return `[${startTime} - ${endTime}] ${entry.text}`;
        }
      })
      .join("\n");

    console.log(`Enhanced transcript extracted successfully: ${transcript.length} segments`);
    
    return new Response(
      JSON.stringify({ 
        transcript: formattedTranscript,
        metadata: {
          segments: transcript.length,
          duration: transcript.length > 0 ? transcript[transcript.length - 1].end : 0,
          speakers: [...new Set(transcript.map(t => t.speaker).filter(Boolean))],
          hasTimestamps: true,
          hasSpeakers: transcript.some(t => t.speaker),
          source: 'web-scraping'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Web scraping fallback failed:", error);
    throw error;
  }
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

// Enhanced speaker detection function
function detectSpeakerPattern(content: string): { hasMultipleSpeakers: boolean, commonPatterns: string[] } {
  const speakerPatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+):/,  // "John Smith:"
    /^([A-Z][A-Z\s]+):/,             // "JOHN SMITH:"
    /^([A-Z][a-z]+):/,               // "John:"
    /^\[([^\]]+)\]:/,                // "[Speaker Name]:"
    /^(\w+\s*\d*):/,                 // "Speaker1:" or "Host:"
  ];
  
  const speakers = new Set();
  const lines = content.split('\n');
  
  for (const line of lines) {
    for (const pattern of speakerPatterns) {
      const match = line.match(pattern);
      if (match) {
        speakers.add(match[1]);
      }
    }
  }
  
  return {
    hasMultipleSpeakers: speakers.size > 1,
    commonPatterns: Array.from(speakers)
  };
}

// Function to detect and extract speaker from text
function detectSpeaker(text: string, context: { hasMultipleSpeakers: boolean, commonPatterns: string[] }): { name: string, text: string } | null {
  const speakerPatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+):\s*(.+)$/,  // "John Smith: text"
    /^([A-Z][A-Z\s]+):\s*(.+)$/,             // "JOHN SMITH: text"
    /^([A-Z][a-z]+):\s*(.+)$/,               // "John: text"
    /^\[([^\]]+)\]:\s*(.+)$/,                // "[Speaker Name]: text"
    /^(\w+\s*\d*):\s*(.+)$/,                 // "Speaker1: text" or "Host: text"
  ];
  
  for (const pattern of speakerPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        name: match[1].trim(),
        text: match[2].trim()
      };
    }
  }
  
  // If multiple speakers detected but no explicit pattern, try to infer
  if (context.hasMultipleSpeakers && context.commonPatterns.length > 0) {
    // Simple heuristic: if text starts with a capital word followed by colon
    const simplePattern = /^([A-Z]\w*):\s*(.+)$/;
    const match = text.match(simplePattern);
    if (match) {
      return {
        name: match[1],
        text: match[2]
      };
    }
  }
  
  return null;
}
