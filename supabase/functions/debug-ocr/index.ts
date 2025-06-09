
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugResult {
  success: boolean;
  environment: {
    ocrApiKeyExists: boolean;
    ocrApiKeyLength?: number;
    supabaseUrlExists: boolean;
    timestamp: string;
  };
  ocrSpaceTest: {
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
    errorDetails?: any;
  };
  recommendations: string[];
  overallStatus: 'healthy' | 'warning' | 'error';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🔍 Debug OCR: Starting comprehensive system check');

  try {
    const result: DebugResult = {
      success: false,
      environment: {
        ocrApiKeyExists: false,
        supabaseUrlExists: false,
        timestamp: new Date().toISOString()
      },
      ocrSpaceTest: {
        success: false
      },
      recommendations: [],
      overallStatus: 'error'
    };

    // Check environment variables
    const ocrApiKey = Deno.env.get('OCR_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    result.environment.ocrApiKeyExists = !!ocrApiKey;
    result.environment.ocrApiKeyLength = ocrApiKey?.length;
    result.environment.supabaseUrlExists = !!supabaseUrl;

    console.log(`🔑 OCR API Key: ${ocrApiKey ? 'Present' : 'Missing'} (${ocrApiKey?.length || 0} chars)`);
    console.log(`🔗 Supabase URL: ${supabaseUrl ? 'Present' : 'Missing'}`);

    if (!ocrApiKey) {
      result.recommendations.push('OCR_API_KEY environment variable is not set. Please configure it in Supabase secrets.');
      result.overallStatus = 'error';
    } else {
      // Test OCR.space API connectivity
      try {
        const testStartTime = Date.now();
        console.log('🧪 Testing OCR.space API connectivity...');

        const testFormData = new FormData();
        testFormData.append('apikey', ocrApiKey);
        testFormData.append('language', 'eng');
        testFormData.append('OCREngine', '2');
        testFormData.append('url', 'https://via.placeholder.com/200x50/000000/FFFFFF?text=TEST');

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: testFormData,
          headers: {
            'User-Agent': 'Supabase-Debug-Function'
          }
        });

        const responseTime = Date.now() - testStartTime;
        result.ocrSpaceTest.statusCode = response.status;
        result.ocrSpaceTest.responseTime = responseTime;

        console.log(`📡 OCR.space API Response: ${response.status} (${responseTime}ms)`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ OCR.space API test successful:', data);
          
          if (data.IsErroredOnProcessing) {
            result.ocrSpaceTest.success = false;
            result.ocrSpaceTest.error = data.ErrorMessage || 'OCR processing error';
            result.recommendations.push(`OCR.space returned processing error: ${data.ErrorMessage}`);
          } else {
            result.ocrSpaceTest.success = true;
            result.overallStatus = result.overallStatus === 'error' ? 'healthy' : result.overallStatus;
          }
        } else {
          const errorText = await response.text();
          result.ocrSpaceTest.success = false;
          result.ocrSpaceTest.error = `HTTP ${response.status}: ${response.statusText}`;
          result.ocrSpaceTest.errorDetails = errorText;
          
          if (response.status === 401) {
            result.recommendations.push('Invalid OCR_API_KEY. Please check your API key at https://ocr.space/OCRAPI');
          } else if (response.status === 429) {
            result.recommendations.push('OCR.space API rate limit exceeded. Wait or upgrade your plan.');
          } else {
            result.recommendations.push(`OCR.space API error ${response.status}. Check API status and try again.`);
          }
          result.overallStatus = 'error';
        }
      } catch (ocrError) {
        console.error('🚨 OCR.space API test failed:', ocrError);
        result.ocrSpaceTest.success = false;
        result.ocrSpaceTest.error = ocrError.message;
        result.recommendations.push('Cannot connect to OCR.space API. Check internet connectivity.');
        result.overallStatus = 'error';
      }
    }

    // Overall success determination
    result.success = result.environment.ocrApiKeyExists && result.ocrSpaceTest.success;

    // Add general recommendations
    if (result.success) {
      result.recommendations.push('✅ OCR system is fully operational');
    } else {
      result.recommendations.push('❌ OCR system requires configuration');
    }

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Debug check completed in ${totalTime}ms - Status: ${result.overallStatus}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Debug OCR function error:', error);
    
    const errorResult: DebugResult = {
      success: false,
      environment: {
        ocrApiKeyExists: false,
        supabaseUrlExists: false,
        timestamp: new Date().toISOString()
      },
      ocrSpaceTest: {
        success: false,
        error: error.message
      },
      recommendations: ['Critical error in debug function. Check Edge Function logs.'],
      overallStatus: 'error'
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
