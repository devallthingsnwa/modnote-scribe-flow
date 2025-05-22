
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const YOUTUBE_TRANSCRIPT_API_KEY = Deno.env.get("YOUTUBE_TRANSCRIPT_API_KEY");
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
    
    // Using youtube-transcript API
    const response = await fetch(
      `https://youtube-transcript.p.rapidapi.com/v1/transcript?videoId=${videoId}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": YOUTUBE_TRANSCRIPT_API_KEY,
          "X-RapidAPI-Host": "youtube-transcript.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcript API error response:", errorText);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch transcript", 
          details: errorText,
          status: response.status 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    // Format transcript for readability
    let formattedTranscript = "";
    if (data.transcript?.lines) {
      formattedTranscript = data.transcript.lines
        .map((line: any) => {
          const time = formatTime(line.start);
          return `[${time}] ${line.text}`;
        })
        .join("\n");
    } else {
      formattedTranscript = "No transcript available for this video.";
    }

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
