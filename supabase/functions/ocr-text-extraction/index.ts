
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

    console.log('Processing OCR request...');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing OCR for file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Validate file type
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const base64String = `data:${file.type};base64,${base64}`;

    console.log(`Converted file to base64, length: ${base64String.length}`);

    // Prepare OCR.space API request
    const ocrFormData = new FormData();
    ocrFormData.append('base64Image', base64String);
    ocrFormData.append('language', language);
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('detectOrientation', 'true');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2');
    ocrFormData.append('filetype', file.type === 'application/pdf' ? 'PDF' : 'Auto');

    console.log('Calling OCR.space API...');

    // Call OCR.space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrApiKey,
      },
      body: ocrFormData,
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR API HTTP error: ${ocrResponse.status} ${ocrResponse.statusText}`);
    }

    const ocrResult = await ocrResponse.json();
    console.log('OCR API response:', JSON.stringify(ocrResult, null, 2));

    if (ocrResult.IsErroredOnProcessing) {
      const errorMessage = ocrResult.ErrorMessage || ocrResult.ParsedResults?.[0]?.ErrorMessage || 'Processing failed';
      throw new Error(`OCR processing error: ${errorMessage}`);
    }

    // Extract text from OCR result
    let extractedText = '';
    if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      extractedText = ocrResult.ParsedResults
        .map((result: any) => result.ParsedText || '')
        .filter((text: string) => text.trim())
        .join('\n\n');
    }

    if (!extractedText.trim()) {
      // Check if there were any error messages in the results
      const errorMessages = ocrResult.ParsedResults
        ?.map((result: any) => result.ErrorMessage)
        .filter((msg: string) => msg)
        .join(', ');
      
      if (errorMessages) {
        throw new Error(`OCR extraction failed: ${errorMessages}`);
      } else {
        throw new Error('No text could be extracted from the file. The image may be too blurry, have poor contrast, or contain no readable text.');
      }
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
        error: error.message || 'Unknown OCR error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
