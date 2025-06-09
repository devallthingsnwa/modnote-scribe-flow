
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  success: boolean;
  tests: {
    environmentCheck: { passed: boolean; message: string; };
    apiConnectivity: { passed: boolean; message: string; responseTime?: number; };
    imageOCR: { passed: boolean; message: string; extractedText?: string; };
    errorHandling: { passed: boolean; message: string; };
  };
  overallScore: number;
  recommendations: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🧪 Test OCR: Starting comprehensive test suite');

  try {
    const result: TestResult = {
      success: false,
      tests: {
        environmentCheck: { passed: false, message: '' },
        apiConnectivity: { passed: false, message: '' },
        imageOCR: { passed: false, message: '' },
        errorHandling: { passed: false, message: '' }
      },
      overallScore: 0,
      recommendations: []
    };

    // Test 1: Environment Check
    const ocrApiKey = Deno.env.get('OCR_API_KEY');
    if (ocrApiKey && ocrApiKey.length > 10) {
      result.tests.environmentCheck.passed = true;
      result.tests.environmentCheck.message = '✅ OCR_API_KEY is properly configured';
    } else {
      result.tests.environmentCheck.message = '❌ OCR_API_KEY is missing or invalid';
    }

    // Test 2: API Connectivity
    if (ocrApiKey) {
      try {
        const startTime = Date.now();
        const testResponse = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: new FormData(),
          headers: { 'User-Agent': 'Test-Suite' }
        });
        const responseTime = Date.now() - startTime;
        
        result.tests.apiConnectivity.responseTime = responseTime;
        result.tests.apiConnectivity.passed = testResponse.status !== 0;
        result.tests.apiConnectivity.message = result.tests.apiConnectivity.passed 
          ? `✅ OCR.space API reachable (${responseTime}ms)` 
          : '❌ Cannot reach OCR.space API';
      } catch (error) {
        result.tests.apiConnectivity.message = `❌ API connectivity failed: ${error.message}`;
      }
    } else {
      result.tests.apiConnectivity.message = '⏭️ Skipped - No API key';
    }

    // Test 3: Image OCR Test
    if (ocrApiKey && result.tests.apiConnectivity.passed) {
      try {
        const formData = new FormData();
        formData.append('apikey', ocrApiKey);
        formData.append('language', 'eng');
        formData.append('url', 'https://via.placeholder.com/300x100/000000/FFFFFF?text=TEST+OCR');

        const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          if (!ocrData.IsErroredOnProcessing && ocrData.ParsedResults?.[0]?.ParsedText) {
            const extractedText = ocrData.ParsedResults[0].ParsedText.trim();
            result.tests.imageOCR.passed = extractedText.includes('TEST');
            result.tests.imageOCR.extractedText = extractedText;
            result.tests.imageOCR.message = result.tests.imageOCR.passed 
              ? `✅ OCR working correctly (extracted: "${extractedText}")` 
              : `⚠️ OCR working but unexpected result: "${extractedText}"`;
          } else {
            result.tests.imageOCR.message = `❌ OCR processing error: ${ocrData.ErrorMessage || 'Unknown error'}`;
          }
        } else {
          result.tests.imageOCR.message = `❌ OCR request failed: ${ocrResponse.status}`;
        }
      } catch (error) {
        result.tests.imageOCR.message = `❌ OCR test failed: ${error.message}`;
      }
    } else {
      result.tests.imageOCR.message = '⏭️ Skipped - Prerequisites not met';
    }

    // Test 4: Error Handling
    if (ocrApiKey) {
      try {
        const formData = new FormData();
        formData.append('apikey', 'invalid-key-test');
        formData.append('language', 'eng');
        formData.append('url', 'https://via.placeholder.com/100x50/000000/FFFFFF?text=TEST');

        const errorResponse = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData
        });

        result.tests.errorHandling.passed = errorResponse.status === 401;
        result.tests.errorHandling.message = result.tests.errorHandling.passed 
          ? '✅ Error handling works correctly' 
          : `⚠️ Unexpected error response: ${errorResponse.status}`;
      } catch (error) {
        result.tests.errorHandling.message = `❌ Error handling test failed: ${error.message}`;
      }
    } else {
      result.tests.errorHandling.message = '⏭️ Skipped - No API key';
    }

    // Calculate overall score
    const passedTests = Object.values(result.tests).filter(test => test.passed).length;
    result.overallScore = Math.round((passedTests / 4) * 100);
    result.success = result.overallScore >= 75;

    // Generate recommendations
    if (!result.tests.environmentCheck.passed) {
      result.recommendations.push('Configure OCR_API_KEY in Supabase secrets');
    }
    if (!result.tests.apiConnectivity.passed) {
      result.recommendations.push('Check internet connectivity and OCR.space API status');
    }
    if (!result.tests.imageOCR.passed) {
      result.recommendations.push('Verify API key permissions and OCR.space account status');
    }
    if (result.success) {
      result.recommendations.push('🎉 All systems operational! OCR is ready for production use.');
    }

    console.log(`🏁 Test suite completed - Score: ${result.overallScore}%`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Test OCR function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      tests: {},
      overallScore: 0,
      recommendations: [`Critical test failure: ${error.message}`]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
