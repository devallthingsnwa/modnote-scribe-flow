
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
    
    // Fetch the YouTube video page
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Look for caption tracks in the page HTML
    const captionRegex = /"captionTracks":\s*(\[.*?\])/;
    const captionMatch = html.match(captionRegex);
    
    if (!captionMatch) {
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
    
    let captionTracks;
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch (parseError) {
      console.error("Error parsing caption tracks:", parseError);
      return new Response(
        JSON.stringify({ 
          transcript: "Error parsing video captions. The video may not have accessible transcripts."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (!captionTracks || captionTracks.length === 0) {
      return new Response(
        JSON.stringify({ 
          transcript: "No caption tracks found for this video."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get the first available caption track (usually auto-generated or English)
    const captionTrack = captionTracks[0];
    let captionUrl = captionTrack.baseUrl;
    
    // Ensure the URL is properly formatted
    if (!captionUrl.startsWith('http')) {
      captionUrl = `https://www.youtube.com${captionUrl}`;
    }
    
    console.log(`Fetching captions from: ${captionUrl}`);
    
    // Fetch the caption content
    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) {
      throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
    }
    
    const captionXml = await captionResponse.text();
    
    // Parse the XML to extract text and timestamps
    const textRegex = /<text start="([^"]*)"[^>]*>([^<]*)<\/text>/g;
    const transcript = [];
    let match;
    
    while ((match = textRegex.exec(captionXml)) !== null) {
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

    console.log(`Transcript fetched successfully: ${transcript.length} segments`);
    
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
