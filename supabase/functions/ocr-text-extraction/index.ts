
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  method?: string;
  processingTime?: number;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔍 OCR: Starting text extraction process');

  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';

    if (!file) {
      throw new Error('No file provided in the request');
    }

    console.log(`📄 Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/bmp', 'image/tiff', 'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported: ${supportedTypes.join(', ')}`);
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`);
    }

    let extractedText = '';
    let method = '';
    let confidence = 0;

    // Handle PDF files with text extraction first
    if (file.type === 'application/pdf') {
      console.log('📄 PDF detected - attempting text extraction');
      try {
        const pdfResult = await extractTextFromPDF(file);
        if (pdfResult.text && pdfResult.text.trim().length > 50) {
          extractedText = pdfResult.text;
          method = 'pdf-text-extraction';
          confidence = 0.9;
          console.log(`✅ PDF text extraction successful: ${extractedText.length} characters`);
        } else {
          console.log('⚠️ PDF text extraction returned minimal text, trying OCR');
          throw new Error('PDF has no extractable text');
        }
      } catch (pdfError) {
        console.warn('PDF text extraction failed:', pdfError.message);
        // Fall through to OCR
      }
    }

    // If no text extracted yet, try OCR
    if (!extractedText) {
      console.log('🔍 Attempting OCR text extraction');
      const ocrResult = await performOCR(file, language);
      extractedText = ocrResult.text;
      method = ocrResult.method;
      confidence = ocrResult.confidence;
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the file using any method');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ OCR completed successfully in ${processingTime}ms using ${method}`);

    const result: OCRResult = {
      success: true,
      text: extractedText.trim(),
      confidence,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      method,
      processingTime
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('🚨 OCR SERVICE ERROR:', error);
    
    const errorResult: OCRResult = {
      success: false,
      error: error.message || 'Unknown OCR error',
      processingTime
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractTextFromPDF(file: File): Promise<{ text: string }> {
  console.log('📄 Starting PDF text extraction');
  
  try {
    // For server-side PDF processing, we'll use a different approach
    // Since PDF.js doesn't work well in Deno, we'll use OCR for PDFs
    throw new Error('Server-side PDF text extraction not available - using OCR');
  } catch (error) {
    console.warn('PDF text extraction failed:', error);
    throw error;
  }
}

async function performOCR(file: File, language: string = 'eng'): Promise<{ text: string; method: string; confidence: number }> {
  const OCR_API_KEY = Deno.env.get('OCR_API_KEY');
  
  if (!OCR_API_KEY) {
    console.error('❌ OCR_API_KEY not configured');
    throw new Error('OCR service not configured - API key missing');
  }

  console.log(`🔍 Using OCR.space API for language: ${language}`);

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const base64String = `data:${file.type};base64,${base64}`;

    console.log(`📤 Sending ${(base64.length / 1024).toFixed(1)}KB to OCR.space`);

    const formData = new FormData();
    formData.append('base64Image', base64String);
    formData.append('language', language);
    formData.append('apikey', OCR_API_KEY);
    formData.append('OCREngine', '2'); // Use engine 2 for better accuracy
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR.space API error: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 OCR.space response received');

    if (result.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${result.ErrorMessage || 'Unknown error'}`);
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No text found in the image');
    }

    const extractedText = result.ParsedResults[0].ParsedText || '';
    
    if (!extractedText.trim()) {
      throw new Error('OCR returned empty text');
    }

    console.log(`✅ OCR.space extraction successful: ${extractedText.length} characters`);

    return {
      text: extractedText,
      method: 'ocr-space-api',
      confidence: 0.8 // OCR.space doesn't provide confidence, so we estimate
    };

  } catch (error) {
    console.error('🚨 OCR.space API error:', error);
    
    // Fallback to Tesseract if OCR.space fails
    console.log('🔄 Falling back to Tesseract OCR');
    return await performTesseractOCR(file, language);
  }
}

async function performTesseractOCR(file: File, language: string): Promise<{ text: string; method: string; confidence: number }> {
  try {
    console.log('🔄 Using Tesseract as fallback OCR');
    
    // Import Tesseract dynamically
    const { default: Tesseract } = await import('npm:tesseract.js@5.1.1');
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('🔍 Starting Tesseract recognition');
    
    const result = await Tesseract.recognize(uint8Array, language, {
      logger: (info: any) => {
        if (info.status === 'recognizing text') {
          console.log(`Tesseract progress: ${Math.round(info.progress * 100)}%`);
        }
      }
    });

    const extractedText = result.data.text.trim();
    
    if (!extractedText) {
      throw new Error('Tesseract returned empty text');
    }

    console.log(`✅ Tesseract extraction successful: ${extractedText.length} characters`);

    return {
      text: extractedText,
      method: 'tesseract-fallback',
      confidence: result.data.confidence / 100
    };

  } catch (error) {
    console.error('🚨 Tesseract OCR error:', error);
    throw new Error(`All OCR methods failed: ${error.message}`);
  }
}
