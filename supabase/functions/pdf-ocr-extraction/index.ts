
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OcrRequest {
  fileData: string; // base64 encoded PDF
  fileName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileName }: OcrRequest = await req.json();

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Processing PDF OCR for: ${fileName}`);

    // Convert base64 PDF to images (simplified approach - in production you'd use a proper PDF library)
    // For now, we'll treat the PDF as an image for OCR
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an OCR specialist. Extract all text content from the provided document image. Maintain the structure and formatting as much as possible. If you see tables, preserve them in markdown format. If you see headers, bullets, or numbered lists, maintain that formatting.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text content from this document. Preserve formatting, structure, and organization.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${fileData}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    console.log(`OpenAI OCR API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI OCR API error response:', errorText);
      throw new Error(`OpenAI OCR API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No text extracted from document');
    }

    console.log('OCR extraction completed successfully');

    return new Response(
      JSON.stringify({ 
        extractedText,
        fileName 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('PDF OCR extraction error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to extract text from PDF',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
