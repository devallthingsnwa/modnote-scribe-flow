
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
    
    // Multiple approaches to find caption tracks
    let captionTracks = null;
    
    // Approach 1: Look for captionTracks in ytInitialPlayerResponse
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
    
    // Approach 2: Direct search for captionTracks
    if (!captionTracks || captionTracks.length === 0) {
      const captionRegex = /"captionTracks"\s*:\s*(\[.*?\])/;
      const captionMatch = html.match(captionRegex);
      
      if (captionMatch) {
        try {
          captionTracks = JSON.parse(captionMatch[1]);
          console.log(`Found ${captionTracks?.length || 0} caption tracks via direct search`);
        } catch (e) {
          console.log("Error parsing caption tracks:", e);
        }
      }
    }
    
    // Approach 3: Look for automatic captions
    if (!captionTracks || captionTracks.length === 0) {
      const autoCaptionRegex = /"automaticCaptions"\s*:\s*({.*?})/;
      const autoCaptionMatch = html.match(autoCaptionRegex);
      
      if (autoCaptionMatch) {
        try {
          const autoCaptions = JSON.parse(autoCaptionMatch[1]);
          // Extract tracks from automatic captions
          const languages = Object.keys(autoCaptions);
          if (languages.length > 0) {
            captionTracks = autoCaptions[languages[0]]; // Use first available language
            console.log(`Found ${captionTracks?.length || 0} automatic caption tracks`);
          }
        } catch (e) {
          console.log("Error parsing automatic captions:", e);
        }
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
    
    // Add format parameter to get plain text
    if (!captionUrl.includes('fmt=')) {
      captionUrl += captionUrl.includes('?') ? '&fmt=srv3' : '?fmt=srv3';
    }
    
    console.log(`Fetching captions from: ${captionUrl}`);
    
    // Fetch the caption content
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
    
    // Parse the caption content (could be XML or JSON depending on format)
    let transcript = [];
    
    if (captionContent.includes('<transcript>') || captionContent.includes('<text')) {
      // XML format
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
            text: text
          });
        }
      }
    } else {
      // Try JSON format
      try {
        const jsonData = JSON.parse(captionContent);
        if (jsonData.events) {
          for (const event of jsonData.events) {
            if (event.segs) {
              for (const seg of event.segs) {
                if (seg.utf8) {
                  transcript.push({
                    start: event.tStartMs / 1000,
                    text: seg.utf8.trim()
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.log("Not JSON format, trying plain text");
        // If all else fails, treat as plain text
        if (captionContent.trim()) {
          transcript.push({
            start: 0,
            text: captionContent.trim()
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
        const time = formatTime(entry.start);
        return `[${time}] ${entry.text}`;
      })
      .join("\n");

    console.log(`Transcript extracted successfully: ${transcript.length} segments`);
    
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

// Helper function to format time in MM:SS
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
