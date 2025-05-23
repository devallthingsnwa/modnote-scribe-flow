
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
    
    // Try to fetch transcript using YouTube's internal API
    try {
      const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const videoPageText = await videoPageResponse.text();
      
      // Extract the initial data from the page
      const ytInitialDataMatch = videoPageText.match(/var ytInitialData = (.+?);/);
      if (!ytInitialDataMatch) {
        throw new Error("Could not find video data");
      }
      
      const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
      
      // Navigate through the complex YouTube data structure to find captions
      const contents = ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
      const primaryInfo = contents?.find((content: any) => content.videoPrimaryInfoRenderer);
      
      if (!primaryInfo) {
        throw new Error("Could not find video info");
      }
      
      // Look for captions in the player response
      const playerResponseMatch = videoPageText.match(/"captions":(.+?),"videoDetails"/);
      if (!playerResponseMatch) {
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
      
      const captionsData = JSON.parse(`{"captions":${playerResponseMatch[1]}}`);
      const captionTracks = captionsData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
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
      
      // Get the first available caption track (usually auto-generated or English)
      const captionTrack = captionTracks[0];
      const captionUrl = captionTrack.baseUrl;
      
      // Fetch the actual caption content
      const captionResponse = await fetch(captionUrl);
      const captionXml = await captionResponse.text();
      
      // Parse the XML to extract text and timestamps
      const textMatches = captionXml.matchAll(/<text start="([^"]*)"[^>]*>([^<]*)<\/text>/g);
      const transcript = [];
      
      for (const match of textMatches) {
        const startTime = parseFloat(match[1]);
        const text = match[2]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        transcript.push({
          start: startTime,
          text: text.trim()
        });
      }
      
      if (transcript.length === 0) {
        return new Response(
          JSON.stringify({ 
            transcript: "No transcript content found for this video."
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Format transcript for readability
      const formattedTranscript = transcript
        .map((entry) => {
          const time = formatTime(entry.start);
          return `[${time}] ${entry.text}`;
        })
        .join("\n");

      console.log("Transcript fetched successfully");
      
      return new Response(
        JSON.stringify({ transcript: formattedTranscript }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
      
    } catch (transcriptError) {
      console.error("Error fetching transcript:", transcriptError);
      
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
    
  } catch (error) {
    console.error("Error in fetch-youtube-transcript function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while fetching the transcript",
        details: error.message 
      }),
      {
        status: 500,
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
