
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    const body = await req.json();
    console.log('🧠 MISTRAL RAG: Processing request with model:', body.model);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'mistral-large-latest',
        messages: body.messages,
        temperature: body.temperature || 0.1,
        max_tokens: body.max_tokens || 2000,
        top_p: body.top_p || 0.95,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Mistral API error:', response.status, errorData);
      throw new Error(`Mistral API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ MISTRAL RAG: Response generated successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 MISTRAL RAG ERROR:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Mistral RAG processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
