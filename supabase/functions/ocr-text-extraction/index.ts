
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
    // Get OCR API key from environment
    const ocrApiKey = Deno.env.get('OCR_API_KEY');
    console.log('Environment variables check:', {
      hasOcrKey: !!ocrApiKey,
      keyLength: ocrApiKey ? ocrApiKey.length : 0
    });

    if (!ocrApiKey) {
      console.error('OCR_API_KEY environment variable not found');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OCR API key not configured. Please contact administrator.'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing OCR request...');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';

    if (!file) {
      console.error('No file provided in request');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No file provided'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
      console.error(`Unsupported file type: ${file.type}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, PDF`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check file size (5MB limit for OCR.space free tier)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error(`File too large: ${file.size} bytes`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Maximum size is 5MB, your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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

    console.log('Calling OCR.space API with parameters:', {
      language,
      fileType: file.type === 'application/pdf' ? 'PDF' : 'Auto',
      ocrEngine: '2'
    });

    // Call OCR.space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrApiKey,
      },
      body: ocrFormData,
    });

    console.log(`OCR API response status: ${ocrResponse.status} ${ocrResponse.statusText}`);

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error(`OCR API HTTP error: ${ocrResponse.status} ${ocrResponse.statusText}`, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `OCR API error: ${ocrResponse.status} ${ocrResponse.statusText}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ocrResult = await ocrResponse.json();
    console.log('OCR API response:', JSON.stringify(ocrResult, null, 2));

    if (ocrResult.IsErroredOnProcessing) {
      const errorMessage = ocrResult.ErrorMessage || ocrResult.ParsedResults?.[0]?.ErrorMessage || 'Processing failed';
      console.error(`OCR processing error: ${errorMessage}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `OCR processing error: ${errorMessage}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
        console.error(`OCR extraction failed: ${errorMessages}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `OCR extraction failed: ${errorMessages}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        console.warn('No text extracted from file');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No text could be extracted from the file. The image may be too blurry, have poor contrast, or contain no readable text.'
          }),
          {
            status: 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
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
