
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { OCRDebugUtils } from "@/utils/ocrDebug";

interface ErrorDetails {
  code?: number;
  message: string;
  timestamp: Date;
  context?: string;
  stackTrace?: string;
}

interface ErrorHandlerProps {
  error?: ErrorDetails;
  onRetry?: () => void;
  onClear?: () => void;
  showTroubleshooting?: boolean;
}

export function ErrorHandler({ error, onRetry, onClear, showTroubleshooting = true }: ErrorHandlerProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [troubleshootingSteps, setTroubleshootingSteps] = useState<string[]>([]);

  useEffect(() => {
    if (error) {
      const steps = OCRDebugUtils.getTroubleshootingSteps(error.code, error.message);
      setTroubleshootingSteps(steps);
    }
  }, [error]);

  if (!error) {
    return null;
  }

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    
    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    onRetry?.();
  };

  const getErrorSeverity = (): 'low' | 'medium' | 'high' => {
    if (error.code === 401) return 'high';
    if (error.code === 429) return 'medium';
    if (error.code && error.code >= 500) return 'high';
    if (error.message.toLowerCase().includes('network')) return 'medium';
    return 'low';
  };

  const getSeverityColor = () => {
    const severity = getErrorSeverity();
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getQuickFix = () => {
    if (error.code === 401) {
      return {
        title: "Fix API Key",
        action: () => window.open('https://ocr.space/OCRAPI', '_blank'),
        description: "Update your OCR.space API key"
      };
    }
    
    if (error.code === 429) {
      return {
        title: "Wait & Retry",
        action: () => setTimeout(handleRetry, 60000),
        description: "Retry automatically in 1 minute"
      };
    }
    
    if (error.message.toLowerCase().includes('network')) {
      return {
        title: "Check Connection",
        action: handleRetry,
        description: "Test your internet connection"
      };
    }
    
    return {
      title: "Retry Operation",
      action: handleRetry,
      description: "Try the operation again"
    };
  };

  const quickFix = getQuickFix();

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
          OCR Error Detected
          <Badge variant={getSeverityColor()} className="ml-auto">
            {getErrorSeverity().toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Summary */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">
                {error.code ? `Error ${error.code}: ` : ''}
                {OCRDebugUtils.formatErrorMessage(error.message)}
              </p>
              <p className="text-xs text-muted-foreground">
                {error.timestamp.toLocaleString()}
                {error.context && ` • ${error.context}`}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            onClick={quickFix.action}
            className="flex-1"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {quickFix.title}
          </Button>
          
          {onClear && (
            <Button
              onClick={onClear}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Troubleshooting Steps */}
        {showTroubleshooting && troubleshootingSteps.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full justify-between p-2"
            >
              <span>Troubleshooting Steps</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showDetails && (
              <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {troubleshootingSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[1.5rem]">{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Technical Details */}
        {error.stackTrace && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
              {error.stackTrace}
            </pre>
          </details>
        )}

        {/* Retry Information */}
        {retryCount > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Retry attempt: {retryCount}
            {retryCount >= 3 && " • Consider checking your configuration"}
          </div>
        )}

        {/* Help Links */}
        <div className="flex justify-center gap-4 text-xs">
          <Button
            variant="link"
            size="sm"
            onClick={() => window.open('https://ocr.space/OCRAPI', '_blank')}
            className="h-auto p-0"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            OCR.space Docs
          </Button>
          
          <Button
            variant="link"
            size="sm"
            onClick={() => window.open('https://docs.lovable.dev/tips-tricks/troubleshooting', '_blank')}
            className="h-auto p-0"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Support
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
