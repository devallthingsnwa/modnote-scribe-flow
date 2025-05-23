
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { load } from "https://deno.land/x/youtube_transcript@v0.0.2/mod.ts";

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
    
    // Use the youtube_transcript Deno module instead of the RapidAPI
    const transcript = await load(videoId);
    
    // If no transcript is available
    if (!transcript || transcript.length === 0) {
      return new Response(
        JSON.stringify({ 
          transcript: "No transcript available for this video."
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
        const time = formatTime(entry.offset / 1000);
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
