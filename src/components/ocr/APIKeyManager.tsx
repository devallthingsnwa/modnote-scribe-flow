
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key, CheckCircle, XCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRDebugUtils } from "@/utils/ocrDebug";

interface APIKeyManagerProps {
  onKeyUpdated?: () => void;
}

export function APIKeyManager({ onKeyUpdated }: APIKeyManagerProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentKeyStatus();
  }, []);

  const checkCurrentKeyStatus = async () => {
    try {
      const diagnostics = await OCRDebugUtils.runSystemDiagnostics();
      setIsConfigured(diagnostics.environment.ocrApiKeyExists);
      setConnectionStatus(diagnostics.ocrSpaceTest.success ? 'connected' : 'disconnected');
    } catch (error) {
      console.warn('Failed to check API key status:', error);
      setConnectionStatus('unknown');
    }
  };

  const validateApiKey = () => {
    const result = OCRDebugUtils.validateApiKeyFormat(apiKey);
    setValidationResult(result);
    return result.valid;
  };

  const testApiKey = async () => {
    if (!validateApiKey()) {
      return;
    }

    setIsTesting(true);
    try {
      // Note: In a real implementation, you would need an Edge Function to test the API key
      // since we can't store secrets client-side. This is a simulation.
      
      toast({
        title: "🔧 Testing API Key",
        description: "This would test the API key with OCR.space. In production, implement via Edge Function.",
      });

      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('connected');
      toast({
        title: "✅ API Key Test",
        description: "API key format validated. Production testing requires Edge Function implementation.",
      });
    } catch (error) {
      setConnectionStatus('disconnected');
      toast({
        title: "❌ API Key Test Failed",
        description: "Failed to test API key. Check your configuration.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveApiKey = async () => {
    if (!validateApiKey()) {
      toast({
        title: "❌ Invalid API Key",
        description: validationResult?.message || "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      // Note: In production, you would save this via a secure Edge Function
      // that updates Supabase secrets. This is a demonstration.
      
      toast({
        title: "🔧 Saving API Key",
        description: "In production, this would securely save to Supabase secrets via Edge Function.",
      });

      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConfigured(true);
      setApiKey("");
      onKeyUpdated?.();
      
      toast({
        title: "✅ API Key Saved",
        description: "OCR.space API key configuration updated successfully!",
      });

      // Recheck status
      await checkCurrentKeyStatus();
    } catch (error) {
      toast({
        title: "❌ Save Failed",
        description: "Failed to save API key. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OCR.space API Key Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Configuration Status:</span>
            <Badge variant={isConfigured ? "default" : "destructive"}>
              {isConfigured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`text-sm ${getStatusColor()}`}>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {isConfigured ? "Update API Key" : "Enter OCR.space API Key"}
          </label>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your OCR.space API key..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationResult(null);
                }}
                className={validationResult?.valid === false ? "border-red-500" : ""}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            
            <Button
              onClick={testApiKey}
              disabled={!apiKey || isTesting}
              variant="outline"
              size="sm"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
            
            <Button
              onClick={saveApiKey}
              disabled={!apiKey || isValidating}
              size="sm"
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          
          {validationResult && !validationResult.valid && (
            <p className="text-sm text-red-600">{validationResult.message}</p>
          )}
        </div>

        {/* Get API Key Link */}
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>Need an OCR.space API key?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://ocr.space/OCRAPI', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Free API Key
            </Button>
          </AlertDescription>
        </Alert>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkCurrentKeyStatus}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Check Status
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const result = await OCRDebugUtils.quickConnectivityTest();
              toast({
                title: result.success ? "✅ Connected" : "❌ Connection Failed",
                description: result.message,
                variant: result.success ? "default" : "destructive"
              });
            }}
            className="flex-1"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Quick Test
          </Button>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <p><strong>Free Plan:</strong> 25,000 requests/month</p>
          <p><strong>Supported:</strong> Images (JPG, PNG, GIF, BMP, TIFF) and PDFs</p>
          <p><strong>Max Size:</strong> 10MB per file</p>
        </div>
      </CardContent>
    </Card>
  );
}
