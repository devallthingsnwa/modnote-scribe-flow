
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Tesseract from "npm:tesseract.js@2.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing OCR with Tesseract for file: ${file.name}, language: ${language}`);

    const arrayBuffer = await file.arrayBuffer();
    const startTime = Date.now();

    const result = await Tesseract.recognize(new Uint8Array(arrayBuffer), language, {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          console.log(`Tesseract progress: ${Math.round(info.progress * 100)}%`);
        }
      }
    });

    const processingTime = Date.now() - startTime;
    const extractedText = result.data.text.trim();

    if (!extractedText) {
      throw new Error('No text could be extracted from the file');
    }

    console.log(`Tesseract OCR completed in ${processingTime}ms. Extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        confidence: `${Math.round(result.data.confidence)}%`,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        processingTime,
        provider: 'Tesseract'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Tesseract OCR extraction failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
