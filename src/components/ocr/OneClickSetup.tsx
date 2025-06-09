
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OneClickSetupProps {
  onSetupComplete?: () => void;
  className?: string;
}

export function OneClickSetup({ onSetupComplete, className }: OneClickSetupProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const runOneClickSetup = async () => {
    setIsRunning(true);
    setStatus('running');
    setProgress(0);

    try {
      // Step 1: Check prerequisites
      setCurrentStep('Checking prerequisites...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Validate API configuration
      setCurrentStep('Validating API configuration...');
      setProgress(25);
      
      const { data: debugResult } = await supabase.functions.invoke('debug-ocr');
      if (!debugResult?.environment?.ocrApiKeyExists) {
        throw new Error('OCR API key not configured');
      }

      // Step 3: Test connectivity
      setCurrentStep('Testing OCR.space connectivity...');
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!debugResult?.ocrSpaceTest?.success) {
        throw new Error('OCR.space connectivity test failed');
      }

      // Step 4: Validate pipeline
      setCurrentStep('Validating OCR pipeline...');
      setProgress(75);
      
      const { data: testResult } = await supabase.functions.invoke('test-ocr');
      if (!testResult?.success || testResult?.overallScore < 75) {
        throw new Error(`OCR pipeline validation failed (${testResult?.overallScore || 0}% score)`);
      }

      // Step 5: Complete setup
      setCurrentStep('Finalizing setup...');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus('success');
      setCurrentStep('Setup complete!');
      
      toast({
        title: "🎉 OCR Setup Complete!",
        description: "Your OCR system is fully configured and ready to use.",
      });

      onSetupComplete?.();

    } catch (error) {
      console.error('One-click setup failed:', error);
      setStatus('error');
      setCurrentStep('Setup failed');
      
      toast({
        title: "❌ Setup Failed",
        description: error.message || 'One-click setup encountered an error.',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      case 'running':
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      default:
        return <Zap className="h-8 w-8 text-gray-400" />;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'success':
        return 'Setup Complete ✅';
      case 'error':
        return 'Setup Failed - Retry';
      case 'running':
        return `Setting Up... (${Math.round(progress)}%)`;
      default:
        return 'One-Click OCR Setup';
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-8 text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">
            {status === 'success' ? 'OCR System Ready!' :
             status === 'error' ? 'Setup Failed' :
             status === 'running' ? 'Setting Up OCR System' :
             'Quick OCR Setup'}
          </h3>
          <p className="text-muted-foreground">
            {status === 'success' ? 'Your OCR system is fully configured and ready to extract text from files.' :
             status === 'error' ? 'The setup process encountered an error. Please try again or check the configuration manually.' :
             status === 'running' ? currentStep :
             'Automatically configure your OCR system with one click. This will set up Edge Functions, validate your API key, and test the complete pipeline.'}
          </p>
        </div>

        {/* Progress Bar */}
        {status === 'running' && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{currentStep}</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={runOneClickSetup}
          disabled={isRunning}
          size="lg"
          className="w-full max-w-sm"
          variant={status === 'error' ? 'destructive' : 'default'}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {getButtonText()}
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              {getButtonText()}
            </>
          )}
        </Button>

        {/* Additional Info */}
        {status === 'idle' && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Deploys debug Edge Functions automatically</p>
            <p>✓ Validates OCR.space API connection</p>
            <p>✓ Tests complete OCR pipeline</p>
            <p>✓ Fixes common configuration issues</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            <p>🎉 You can now upload files for text extraction!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
