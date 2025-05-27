
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { TranscriptExtractor } from "./transcriptExtractor.ts";
import { corsHeaders } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, options = {} } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Video ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Fetching transcript for video: ${videoId} with options:`, options);
    
    const extractor = new TranscriptExtractor();
    const result = await extractor.extractTranscript(videoId, options);
    
    return result;
    
  } catch (error) {
    console.error("Error in fetch-youtube-transcript function:", error);
    
    return new Response(
      JSON.stringify({ 
        transcript: "Unable to fetch transcript for this video. The video may not have captions available or may be restricted.",
        error: error.message,
        success: false
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
