
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert ArrayBuffer to base64 in chunks to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks
  let result = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(result);
}

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
          error: 'OCR API key not configured. Please add the OCR_API_KEY to your Supabase project secrets.'
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
    const attempt = formData.get('attempt') as string || '1';

    // Health check - return early if no file (for service status checks)
    if (!file) {
      console.log('No file provided - health check request');
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

    console.log(`Processing OCR for file: ${file.name}, type: ${file.type}, size: ${file.size}, attempt: ${attempt}`);

    // Enhanced file validation
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      console.error(`Unsupported file type: ${file.type}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, WEBP, PDF`
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

    // Check minimum file size
    if (file.size < 100) {
      console.error(`File too small: ${file.size} bytes`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File too small. Please ensure the file is not corrupted.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Convert file to base64 using our safe chunked method
      const arrayBuffer = await file.arrayBuffer();
      console.log(`Converting file to base64: ${arrayBuffer.byteLength} bytes`);
      
      const base64 = arrayBufferToBase64(arrayBuffer);
      const base64String = `data:${file.type};base64,${base64}`;

      console.log(`Converted file to base64 successfully, length: ${base64String.length}`);

      // Prepare OCR.space API request with enhanced parameters
      const ocrFormData = new FormData();
      ocrFormData.append('base64Image', base64String);
      ocrFormData.append('language', language);
      ocrFormData.append('isOverlayRequired', 'false');
      ocrFormData.append('detectOrientation', 'true');
      ocrFormData.append('scale', 'true');
      ocrFormData.append('OCREngine', '2'); // Use Engine 2 for better accuracy
      ocrFormData.append('filetype', file.type === 'application/pdf' ? 'PDF' : 'Auto');
      
      console.log('Calling OCR.space API with parameters:', {
        language,
        fileType: file.type === 'application/pdf' ? 'PDF' : 'Auto',
        ocrEngine: '2',
        attempt: attempt
      });

      // Call OCR.space API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': ocrApiKey,
        },
        body: ocrFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`OCR API response status: ${ocrResponse.status} ${ocrResponse.statusText}`);

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error(`OCR API HTTP error: ${ocrResponse.status} ${ocrResponse.statusText}`, errorText);
        
        // Provide specific error messages based on status codes
        let userFriendlyError = `OCR API error: ${ocrResponse.status}`;
        if (ocrResponse.status === 429) {
          userFriendlyError = 'OCR service rate limit exceeded. Please wait a moment and try again.';
        } else if (ocrResponse.status >= 500) {
          userFriendlyError = 'OCR service is temporarily unavailable. Please try again later.';
        } else if (ocrResponse.status === 401) {
          userFriendlyError = 'OCR API authentication failed. Please check the API key configuration.';
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: userFriendlyError
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const ocrResult = await ocrResponse.json();
      console.log('OCR API response:', JSON.stringify(ocrResult, null, 2));

      // Enhanced error handling for OCR result
      if (ocrResult.IsErroredOnProcessing) {
        const errorDetails = ocrResult.ErrorDetails || [];
        const errorMessage = ocrResult.ErrorMessage || 
          ocrResult.ParsedResults?.[0]?.ErrorMessage || 
          'Processing failed';
        
        console.error(`OCR processing error: ${errorMessage}`, errorDetails);
        
        // Provide helpful error messages based on common issues
        let userFriendlyError = errorMessage;
        if (errorMessage.includes('Unable to OCR image')) {
          userFriendlyError = 'Unable to extract text from this image. The image may be too blurry, have poor contrast, or contain no readable text.';
        } else if (errorMessage.includes('File size too big')) {
          userFriendlyError = 'File size exceeds the limit. Please use a smaller file.';
        } else if (errorMessage.includes('Invalid file format')) {
          userFriendlyError = 'Invalid file format. Please use JPG, PNG, GIF, BMP, TIFF, WEBP, or PDF files.';
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `OCR processing error: ${userFriendlyError}`
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
              error: 'No text could be extracted from the file. The image may be too blurry, have poor contrast, or contain no readable text. Please try with a clearer, high-contrast image.'
            }),
            {
              status: 422,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      console.log(`OCR completed successfully on attempt ${attempt}. Extracted ${extractedText.length} characters`);

      return new Response(
        JSON.stringify({
          success: true,
          text: extractedText,
          confidence: ocrResult.ParsedResults?.[0]?.TextOrientation || 'Unknown',
          fileInfo: {
            name: file.name,
            type: file.type,
            size: file.size
          },
          metadata: {
            attempt: parseInt(attempt),
            processingTime: ocrResult.ProcessingTimeInMilliseconds || 'Unknown'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (conversionError) {
      console.error('File conversion or OCR API call failed:', conversionError);
      
      let errorMessage = 'Failed to process the file';
      if (conversionError instanceof Error) {
        if (conversionError.name === 'AbortError') {
          errorMessage = 'OCR request timed out. Please try with a smaller file or try again later.';
        } else {
          errorMessage = conversionError.message;
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('OCR extraction error:', error);
    
    let errorMessage = 'Unknown OCR error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
