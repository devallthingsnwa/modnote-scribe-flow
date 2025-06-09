import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests for OCR processing
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const ocrApiKey = Deno.env.get('OCR_API_KEY');
    if (!ocrApiKey) {
      throw new Error('OCR API key not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = (formData.get('language') as string) || 'eng';

    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 
      'image/tiff', 'image/webp', 'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types: ${allowedTypes.join(', ')}`);
    }

    // Check file size (OCR.space has limits)
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      throw new Error(`File too large: ${file.size} bytes. Maximum allowed: ${maxSize} bytes`);
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
    
    // Set filetype properly for PDFs
    if (file.type === 'application/pdf') {
      ocrFormData.append('filetype', 'PDF');
    }

    console.log('Calling OCR.space API...');
    const startTime = Date.now();

    // Call OCR.space API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let ocrResponse: Response;
    try {
      ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': ocrApiKey,
        },
        body: ocrFormData,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const responseTime = Date.now() - startTime;
    console.log(`OCR API response received in ${responseTime}ms`);

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error(`OCR API HTTP error: ${ocrResponse.status} - ${errorText}`);
      throw new Error(`OCR API HTTP error: ${ocrResponse.status} - ${errorText || 'Unknown error'}`);
    }

    const ocrResult = await ocrResponse.json();
    console.log('OCR Result structure:', JSON.stringify(ocrResult, null, 2));

    if (ocrResult.IsErroredOnProcessing) {
      const errorMessage = ocrResult.ParsedResults?.[0]?.ErrorMessage || 
                          ocrResult.ErrorMessage || 
                          'Processing failed';
      console.error(`OCR processing error: ${errorMessage}`);
      throw new Error(`OCR processing error: ${errorMessage}`);
    }

    // Extract and clean text from OCR result
    let extractedText = '';
    if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      extractedText = ocrResult.ParsedResults
        .map((result: any) => result.ParsedText || '')
        .filter((text: string) => text.trim().length > 0)
        .join('\n\n')
        .trim();
    }

    if (!extractedText) {
      console.log('No text extracted. OCR Result:', ocrResult);
      throw new Error('No text could be extracted from the file. The file may be empty, corrupted, or contain no readable text.');
    }

    // Basic text cleanup for better quality
    extractedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .trim();

    console.log(`OCR completed successfully. Extracted ${extractedText.length} characters`);

    // Get confidence score if available
    const firstResult = ocrResult.ParsedResults?.[0];
    const confidence = firstResult?.TextOrientation || 'Unknown';

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
        processingTime: responseTime,
        ocrEngine: 'OCR.space v2'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('OCR extraction error:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = error.message || 'OCR extraction failed';
    
    if (error.name === 'AbortError') {
      statusCode = 408;
      errorMessage = 'OCR processing timed out';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

console.log('OCR server started on port 8000');