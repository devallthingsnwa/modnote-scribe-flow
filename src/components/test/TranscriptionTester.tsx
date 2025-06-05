
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    setCurrentTest('Starting test suite...');

    try {
      // Simulate test results since transcription service was removed
      const mockResults: TestResult[] = [
        {
          provider: 'test-system',
          success: false,
          duration: 1000,
          textLength: 0,
          error: 'Transcription services have been removed from the system'
        }
      ];
      
      setTestResults(mockResults);
      setCurrentTest('Test completed!');
      
      toast({
        title: "❌ Test Complete",
        description: "Transcription services are no longer available.",
        variant: "destructive"
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
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Notice</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Transcription services have been removed from the system. This tester is no longer functional.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Enter YouTube URL to test..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="flex-1"
              disabled
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
                      <Badge variant="destructive">
                        Failed
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                      <strong>Error:</strong> {result.error}
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
