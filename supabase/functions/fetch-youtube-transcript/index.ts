
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { TranscriptExtractor } from "./transcriptExtractor.ts";
import { validateVideoId, extractVideoId, corsHeaders } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let videoId: string;
    let options = {};
    
    // Parse request body
    try {
      const body = await req.json();
      videoId = body.videoId;
      options = body.options || {};
      
      if (!videoId && body.url) {
        // Support both direct videoId and URL parameters
        videoId = extractVideoId(body.url) || '';
      }
    } catch (e) {
      // Fallback to query parameters for GET requests
      const url = new URL(req.url);
      videoId = url.searchParams.get('videoId') || '';
      
      if (!videoId) {
        const urlParam = url.searchParams.get('url');
        if (urlParam) {
          videoId = extractVideoId(urlParam) || '';
        }
      }
    }
    
    if (!videoId || !validateVideoId(videoId)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Valid YouTube video ID is required",
          transcript: "Unable to fetch transcript: Invalid or missing YouTube video ID."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Starting enhanced transcript fetch for video: ${videoId} (extended timeout: ${options.extendedTimeout || false})`);
    
    // Enhanced processing with extended timeout options for longer videos
    const extractor = new TranscriptExtractor();
    return await extractor.extractTranscriptWithExtendedHandling(videoId, options);
    
  } catch (error) {
    console.error("Error in fetch-youtube-transcript function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        transcript: "Unable to fetch transcript due to a technical error. Please try again later.",
        error: error.message || "Unknown error occurred",
        metadata: {
          videoId: "unknown",
          segments: 0,
          duration: 0,
          extractionMethod: 'error'
        }
      }),
      {
        status: 200, // Return 200 even on error for consistent client handling
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
