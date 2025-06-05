
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "./utils.ts";
import { ContentParser } from "./contentParser.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, videoUrl, options = {} } = await req.json();
    
    if (!videoId && !videoUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing videoId or videoUrl parameter",
          transcript: "Missing required parameters"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`🎯 Processing transcript request for: ${videoId || videoUrl}`);

    const contentParser = new ContentParser();
    const url = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
    
    // Get transcript using streamlined strategy system
    const result = await contentParser.fetchTranscript(url);
    
    // Return the processed result
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in transcript fetching:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`,
        transcript: `Unable to process request: ${error.message}`,
        metadata: {
          segments: 0,
          duration: 0,
          hasTimestamps: false,
          source: 'error',
          language: 'unknown',
          videoId: 'unknown',
          extractionMethod: 'error'
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
