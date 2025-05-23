
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
    
    // Parse WebVTT format
    let transcript = [];
    
    if (captionContent.includes('WEBVTT')) {
      // Parse WebVTT format
      const lines = captionContent.split('\n');
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
          // Add text to current cue
          currentCue.text += (currentCue.text ? ' ' : '') + line
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/<[^>]*>/g, '') // Remove any HTML tags
            .trim();
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
            text: text
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
    
    // Format transcript for readability with timestamps
    const formattedTranscript = transcript
      .map((entry) => {
        const startTime = formatTime(entry.start);
        const endTime = formatTime(entry.end);
        return `[${startTime} - ${endTime}] ${entry.text}`;
      })
      .join("\n");

    console.log(`WebVTT transcript extracted successfully: ${transcript.length} segments`);
    
    return new Response(
      JSON.stringify({ transcript: formattedTranscript }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
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

// Helper function to parse WebVTT time format (HH:MM:SS.mmm) to seconds
function parseWebVTTTime(timeString: string): number {
  const parts = timeString.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsParts = parts[2].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// Helper function to format time in MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
