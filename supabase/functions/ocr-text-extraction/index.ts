
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRSpaceResult {
  ParsedResults?: Array<{
    ParsedText: string;
    TextOrientation?: string;
    FileParseExitCode: number;
    ErrorMessage?: string;
    ErrorDetails?: string;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string;
  ErrorDetails?: string;
  ProcessingTimeInMilliseconds?: number;
}

function chunkArray(array: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in 8KB chunks
  const chunks = chunkArray(bytes, chunkSize);
  
  let binaryString = '';
  for (const chunk of chunks) {
    binaryString += String.fromCharCode(...chunk);
  }
  
  return btoa(binaryString);
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

    // Enhanced file validation
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/bmp', 'image/tiff', 'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File too large. Maximum size is 5MB');
    }

    // Convert file to base64 with chunked processing
    const arrayBuffer = await file.arrayBuffer();
    console.log('Converting to base64...');
    
    const base64 = arrayBufferToBase64(arrayBuffer);
    console.log(`Base64 conversion completed. Length: ${base64.length}`);

    // Prepare OCR.space API request with optimized settings
    const ocrFormData = new FormData();
    ocrFormData.append('base64Image', `data:${file.type};base64,${base64}`);
    ocrFormData.append('language', language);
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('detectOrientation', 'true');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
    ocrFormData.append('isTable', 'false'); // Focus on raw text, not tables
    
    // Additional settings for text-focused extraction
    if (file.type === 'application/pdf') {
      ocrFormData.append('isCreateSearchablePdf', 'false');
      ocrFormData.append('isSearchablePdfHideTextLayer', 'false');
    }

    console.log('Calling OCR.space API...');
    const startTime = Date.now();

    // Call OCR.space API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': ocrApiKey,
      },
      body: ocrFormData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const processingTime = Date.now() - startTime;

    const ocrResult: OCRSpaceResult = await ocrResponse.json();
    console.log(`OCR API response received in ${processingTime}ms`);

    if (!ocrResponse.ok) {
      throw new Error(`OCR API HTTP error: ${ocrResponse.status} - ${ocrResult.ErrorMessage || 'Unknown error'}`);
    }

    if (ocrResult.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${ocrResult.ErrorMessage || ocrResult.ErrorDetails || 'Processing failed'}`);
    }

    // Extract and validate text
    let extractedText = '';
    let confidence = 0;
    
    if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      const validResults = ocrResult.ParsedResults.filter(result => 
        result.FileParseExitCode === 1 && result.ParsedText
      );

      if (validResults.length > 0) {
        extractedText = validResults.map(result => result.ParsedText).join('\n\n');
        
        // Calculate confidence based on text quality
        confidence = calculateTextConfidence(extractedText);
        
        console.log(`Text extracted successfully: ${extractedText.length} characters, confidence: ${confidence.toFixed(2)}`);
      } else {
        const errors = ocrResult.ParsedResults.map(r => r.ErrorMessage || r.ErrorDetails).filter(Boolean);
        throw new Error(`No valid text found. Errors: ${errors.join(', ') || 'Unknown parsing error'}`);
      }
    } else {
      throw new Error('No parsed results returned from OCR service');
    }

    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the file. The image may be too low quality, contain no text, or be in an unsupported format.');
    }

    // Basic text quality validation
    if (extractedText.length < 3) {
      console.warn('Very short text extracted, may indicate poor OCR quality');
    }

    console.log(`OCR completed successfully. Extracted ${extractedText.length} characters in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        confidence: confidence,
        engine: 'OCR.space',
        processingTime: processingTime,
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
    
    let errorMessage = 'Unknown error occurred during OCR processing';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Set appropriate status codes for different error types
      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        statusCode = 408; // Request Timeout
        errorMessage = 'OCR processing timed out. Please try with a smaller file or better image quality.';
      } else if (errorMessage.includes('Unsupported file type')) {
        statusCode = 400; // Bad Request
      } else if (errorMessage.includes('File too large')) {
        statusCode = 413; // Payload Too Large
      } else if (errorMessage.includes('API key')) {
        statusCode = 503; // Service Unavailable
      }
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

function calculateTextConfidence(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  let confidence = 0.3; // Base confidence

  // Check word patterns
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const validWords = words.filter(w => /^[a-zA-Z0-9\-'.,!?()]+$/.test(w));
  const wordRatio = validWords.length / Math.max(words.length, 1);
  confidence += wordRatio * 0.4;

  // Check sentence structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgWordsPerSentence = words.length / sentences.length;
    if (avgWordsPerSentence > 3 && avgWordsPerSentence < 30) {
      confidence += 0.2;
    }
  }

  // Check character distribution
  const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  if (alphaRatio > 0.6) confidence += 0.1;

  // Penalty for very short text
  if (text.length < 50) confidence *= 0.8;

  return Math.min(confidence, 1.0);
}
