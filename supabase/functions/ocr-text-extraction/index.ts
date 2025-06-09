
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunked base64 conversion to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  
  return btoa(result);
}

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

    // Convert file to base64 using chunked approach
    console.log('Converting to base64...');
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    console.log(`Base64 conversion completed. Length: ${base64.length}`);

    // Prepare OCR.space API request with enhanced settings for text extraction
    const ocrFormData = new FormData();
    ocrFormData.append('base64Image', `data:${file.type};base64,${base64}`);
    ocrFormData.append('language', language);
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('detectOrientation', 'true');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2'); // Use OCR Engine 2 for better text recognition
    ocrFormData.append('isTable', 'false'); // Focus on text, not tables
    ocrFormData.append('filetype', file.type.includes('pdf') ? 'PDF' : 'Auto');

    console.log('Calling OCR.space API...');
    const startTime = Date.now();

    // Call OCR.space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrApiKey,
      },
      body: ocrFormData,
    });

    const responseTime = Date.now() - startTime;
    console.log(`OCR API response received in ${responseTime}ms`);

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error(`OCR API HTTP error: ${ocrResponse.status} - ${errorText}`);
      throw new Error(`OCR API HTTP error: ${ocrResponse.status} - ${errorText || 'Unknown error'}`);
    }

    const ocrResult = await ocrResponse.json();

    if (ocrResult.IsErroredOnProcessing) {
      const errorMessage = ocrResult.ParsedResults?.[0]?.ErrorMessage || ocrResult.ErrorMessage || 'Processing failed';
      console.error(`OCR processing error: ${errorMessage}`);
      throw new Error(`OCR processing error: ${errorMessage}`);
    }

    // Extract and clean text from OCR result
    let extractedText = '';
    if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      extractedText = ocrResult.ParsedResults
        .map((result: any) => result.ParsedText)
        .join('\n\n')
        .trim();
    }

    if (!extractedText) {
      throw new Error('No text could be extracted from the file');
    }

    // Basic text cleanup for better quality
    extractedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .trim();

    console.log(`OCR completed successfully. Extracted ${extractedText.length} characters`);

    // Calculate confidence based on text quality
    const confidence = ocrResult.ParsedResults?.[0]?.TextOrientation || 'Unknown';

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        confidence: confidence,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        processingTime: responseTime
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
        error: error.message || 'OCR extraction failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
