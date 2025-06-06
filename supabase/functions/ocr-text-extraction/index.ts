
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const ocrApiKey = Deno.env.get('OCR_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR API key not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing OCR for file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Prepare OCR.space API request
    const ocrFormData = new FormData();
    ocrFormData.append('base64Image', `data:${file.type};base64,${base64}`);
    ocrFormData.append('language', language);
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('detectOrientation', 'true');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2');

    // Call OCR.space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrApiKey,
      },
      body: ocrFormData,
    });

    const ocrResult = await ocrResponse.json();

    if (!ocrResponse.ok) {
      throw new Error(`OCR API error: ${ocrResult.ErrorMessage || 'Unknown error'}`);
    }

    if (ocrResult.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${ocrResult.ErrorMessage || 'Processing failed'}`);
    }

    // Extract text from OCR result
    let extractedText = '';
    if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      extractedText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join('\n\n');
    }

    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the image');
    }

    console.log(`OCR completed successfully. Extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        confidence: ocrResult.ParsedResults?.[0]?.TextOrientation || 'Unknown',
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('OCR extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
