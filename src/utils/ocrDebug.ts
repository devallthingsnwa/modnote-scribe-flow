
import { supabase } from "@/integrations/supabase/client";

export interface DebugResult {
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

export interface TestResult {
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

/**
 * OCR Debug Utilities for comprehensive system diagnostics
 */
export class OCRDebugUtils {
  /**
   * Run comprehensive OCR system diagnostics
   */
  static async runSystemDiagnostics(): Promise<DebugResult> {
    try {
      console.log('🔍 Running OCR system diagnostics...');
      
      const { data, error } = await supabase.functions.invoke('debug-ocr');
      
      if (error) {
        throw new Error(`Debug function error: ${error.message}`);
      }
      
      return data as DebugResult;
    } catch (error) {
      console.error('🚨 System diagnostics failed:', error);
      return {
        success: false,
        environment: {
          ocrApiKeyExists: false,
          supabaseUrlExists: false,
          timestamp: new Date().toISOString()
        },
        ocrSpaceTest: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        recommendations: ['Failed to run diagnostics. Check Edge Function deployment.'],
        overallStatus: 'error'
      };
    }
  }

  /**
   * Run comprehensive OCR test suite
   */
  static async runTestSuite(): Promise<TestResult> {
    try {
      console.log('🧪 Running OCR test suite...');
      
      const { data, error } = await supabase.functions.invoke('test-ocr');
      
      if (error) {
        throw new Error(`Test function error: ${error.message}`);
      }
      
      return data as TestResult;
    } catch (error) {
      console.error('🚨 Test suite failed:', error);
      return {
        success: false,
        tests: {
          environmentCheck: { passed: false, message: 'Test function unavailable' },
          apiConnectivity: { passed: false, message: 'Test function unavailable' },
          imageOCR: { passed: false, message: 'Test function unavailable' },
          errorHandling: { passed: false, message: 'Test function unavailable' }
        },
        overallScore: 0,
        recommendations: ['Failed to run test suite. Check Edge Function deployment.']
      };
    }
  }

  /**
   * Quick connectivity test
   */
  static async quickConnectivityTest(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      const startTime = Date.now();
      const result = await this.runSystemDiagnostics();
      const responseTime = Date.now() - startTime;
      
      return {
        success: result.success,
        message: result.success ? 'OCR system operational' : 'OCR system has issues',
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connectivity test failed'
      };
    }
  }

  /**
   * Validate API key format
   */
  static validateApiKeyFormat(apiKey: string): { valid: boolean; message: string } {
    if (!apiKey) {
      return { valid: false, message: 'API key is required' };
    }
    
    if (apiKey.length < 10) {
      return { valid: false, message: 'API key too short (minimum 10 characters)' };
    }
    
    if (apiKey.length > 100) {
      return { valid: false, message: 'API key too long (maximum 100 characters)' };
    }
    
    // Basic alphanumeric check for OCR.space keys
    if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
      return { valid: false, message: 'API key contains invalid characters' };
    }
    
    return { valid: true, message: 'API key format is valid' };
  }

  /**
   * Get error-specific troubleshooting steps
   */
  static getTroubleshootingSteps(errorCode?: number, errorMessage?: string): string[] {
    const steps: string[] = [];
    
    if (errorCode === 401) {
      steps.push('🔑 Invalid API key - check your OCR.space account');
      steps.push('🔗 Get a new API key at https://ocr.space/OCRAPI');
      steps.push('⚙️ Update the API key in your configuration');
    } else if (errorCode === 429) {
      steps.push('⏰ Rate limit exceeded - wait before retrying');
      steps.push('💳 Consider upgrading your OCR.space plan');
      steps.push('⚡ Implement request throttling');
    } else if (errorCode === 500 || errorCode === 503) {
      steps.push('🔧 OCR.space API is experiencing issues');
      steps.push('⏳ Wait and retry in a few minutes');
      steps.push('📧 Contact OCR.space support if persistent');
    } else if (errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
      steps.push('🌐 Check your internet connectivity');
      steps.push('🔥 Verify firewall settings');
      steps.push('🔄 Try refreshing the page');
    } else {
      steps.push('🔍 Check the error details above');
      steps.push('📋 Copy error message for support');
      steps.push('🔄 Try the operation again');
    }
    
    steps.push('🧪 Use the test button to verify fixes');
    
    return steps;
  }

  /**
   * Format error messages for user display
   */
  static formatErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error) {
      return error.error;
    }
    
    return 'An unknown error occurred';
  }

  /**
   * Check if Edge Function is deployed and accessible
   */
  static async checkEdgeFunctionStatus(): Promise<{ deployed: boolean; accessible: boolean; message: string }> {
    try {
      // Try to call a simple function to check if Edge Functions are working
      const { error } = await supabase.functions.invoke('debug-ocr');
      
      if (error?.message?.includes('not found') || error?.message?.includes('404')) {
        return { deployed: false, accessible: false, message: 'Edge Function not deployed' };
      }
      
      if (error) {
        return { deployed: true, accessible: false, message: `Edge Function error: ${error.message}` };
      }
      
      return { deployed: true, accessible: true, message: 'Edge Function operational' };
    } catch (error) {
      return { deployed: false, accessible: false, message: 'Cannot check Edge Function status' };
    }
  }
}
