
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TranscriptionService } from '@/lib/transcriptionService';
import { ExternalProviderService } from '@/lib/transcription/externalProviderService';

interface TestResult {
  provider: string;
  success: boolean;
  duration: number;
  textLength: number;
  error?: string;
  metadata?: any;
}

export function TranscriptionTester() {
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const { toast } = useToast();

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest('Starting comprehensive transcription test...');

    try {
      // Test 1: Full transcription with fallback system
      setCurrentTest('Testing full transcription with fallback system...');
      const startTime = Date.now();
      
      const result = await TranscriptionService.transcribeWithFallback(testUrl);
      const duration = Date.now() - startTime;
      
      const fullTestResult: TestResult = {
        provider: 'full-system',
        success: result.success,
        duration,
        textLength: result.text?.length || 0,
        error: result.error,
        metadata: result.metadata
      };
      
      setTestResults(prev => [...prev, fullTestResult]);
      
      // Test 2: Individual provider tests
      const providers = ['podsqueeze', 'whisper', 'riverside'];
      
      for (const provider of providers) {
        setCurrentTest(`Testing ${provider} provider...`);
        const providerStartTime = Date.now();
        
        try {
          const providerResult = await ExternalProviderService.callTranscriptionAPI(
            provider,
            testUrl,
            { include_metadata: true, include_timestamps: true }
          );
          
          const providerDuration = Date.now() - providerStartTime;
          
          const providerTestResult: TestResult = {
            provider,
            success: providerResult.success,
            duration: providerDuration,
            textLength: providerResult.text?.length || 0,
            error: providerResult.error,
            metadata: providerResult.metadata
          };
          
          setTestResults(prev => [...prev, providerTestResult]);
          
        } catch (error) {
          const providerTestResult: TestResult = {
            provider,
            success: false,
            duration: Date.now() - providerStartTime,
            textLength: 0,
            error: error.message
          };
          
          setTestResults(prev => [...prev, providerTestResult]);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Test 3: YouTube metadata extraction
      setCurrentTest('Testing YouTube metadata extraction...');
      const videoId = TranscriptionService.extractVideoId(testUrl);
      if (videoId) {
        const metadata = await TranscriptionService.getYouTubeMetadata(videoId);
        console.log('YouTube Metadata Test:', metadata);
      }
      
      setCurrentTest('Test completed!');
      
      toast({
        title: "✅ Transcription Test Complete",
        description: `Tested ${testResults.length} providers. Check results below.`
      });
      
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "❌ Test Failed",
        description: error.message || "Test encountered an error",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (result.error?.includes('failed') || result.error?.includes('error')) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getProviderConfig = () => {
    return TranscriptionService.getProviderConfig().map((config, index) => ({
      name: config.provider,
      priority: config.priority,
      description: `Provider for transcription services`,
      capabilities: ['transcription', 'youtube', 'audio']
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Transcription System Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter YouTube URL to test..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={runComprehensiveTest}
              disabled={isRunning || !testUrl.trim()}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {currentTest && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentTest}
            </div>
          )}

          {/* Provider Configuration Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getProviderConfig().map((provider) => (
              <Card key={provider.name} className="border-2">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{provider.name}</h4>
                      <Badge variant="outline">Priority {provider.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      <h4 className="font-medium capitalize">{result.provider}</h4>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Text Length:</span>
                      <p className="font-mono">{result.textLength} chars</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-mono">{result.duration}ms</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <p className="font-mono">{result.metadata?.provider || result.provider}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Method:</span>
                      <p className="font-mono">{result.metadata?.extractionMethod || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  
                  {result.metadata && !result.error && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <strong>Metadata:</strong>
                      <pre className="mt-1 overflow-x-auto">
                        {JSON.stringify(result.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
