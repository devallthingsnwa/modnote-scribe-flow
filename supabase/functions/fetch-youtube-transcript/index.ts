
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
        JSON.stringify({ 
          success: false,
          error: "Video ID is required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Starting transcript fetch for video: ${videoId}`);
    
    const extractor = new TranscriptExtractor();
    const result = await extractor.extractTranscript(videoId, options);
    
    // Check if we got a valid response
    const responseData = await result.json();
    
    if (responseData.success && responseData.transcript) {
      console.log(`Transcript successfully extracted: ${responseData.transcript.length} characters`);
      return new Response(
        JSON.stringify({
          success: true,
          transcript: responseData.transcript,
          metadata: responseData.metadata || {
            videoId,
            segments: 0,
            duration: 0,
            extractionMethod: 'unknown'
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      console.warn(`Transcript extraction failed for ${videoId}: ${responseData.error || 'Unknown error'}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          transcript: "Unable to fetch transcript for this video. The video may not have captions available or may be restricted.",
          error: responseData.error || "Transcript extraction failed",
          metadata: {
            videoId,
            segments: 0,
            duration: 0,
            extractionMethod: 'failed'
          }
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
