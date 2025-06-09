
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 OCR: Processing file with fallback OCR service');

    // This is a fallback service - return an error to force client-side processing
    return new Response(
      JSON.stringify({
        success: false,
        error: 'OCR service temporarily unavailable - using client-side processing',
        fallback: true
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('🚨 OCR SERVICE ERROR:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'OCR service error - falling back to client-side processing',
        fallback: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
