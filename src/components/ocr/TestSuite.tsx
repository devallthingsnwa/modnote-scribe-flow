
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Play, RotateCcw, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRDebugUtils, TestResult } from "@/utils/ocrDebug";

interface TestSuiteProps {
  onTestComplete?: (result: TestResult) => void;
}

export function TestSuite({ onTestComplete }: TestSuiteProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{ timestamp: Date; score: number; success: boolean }>>([]);
  const { toast } = useToast();

  const runTestSuite = async () => {
    setIsRunning(true);
    setCurrentTest('Initializing test suite...');
    setProgress(0);
    setResults(null);

    try {
      // Environment Check
      setCurrentTest('🔧 Checking environment configuration...');
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // API Connectivity
      setCurrentTest('🌐 Testing API connectivity...');
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // OCR Processing
      setCurrentTest('🔍 Testing OCR processing...');
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Error Handling
      setCurrentTest('⚠️ Testing error handling...');
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get actual results
      setCurrentTest('📊 Compiling results...');
      const testResults = await OCRDebugUtils.runTestSuite();
      setProgress(100);

      setResults(testResults);
      onTestComplete?.(testResults);

      // Update history
      const historyEntry = {
        timestamp: new Date(),
        score: testResults.overallScore,
        success: testResults.success
      };
      setTestHistory(prev => [historyEntry, ...prev.slice(0, 4)]); // Keep last 5 results

      toast({
        title: testResults.success ? "✅ Test Suite Passed" : "⚠️ Test Suite Issues",
        description: `Overall score: ${testResults.overallScore}% - ${testResults.recommendations[0]}`,
        variant: testResults.success ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Test suite failed:', error);
      
      toast({
        title: "❌ Test Suite Failed",
        description: "Failed to run comprehensive tests. Check your configuration.",
        variant: "destructive"
      });
      
      setResults({
        success: false,
        tests: {
          environmentCheck: { passed: false, message: 'Test suite error' },
          apiConnectivity: { passed: false, message: 'Test suite error' },
          imageOCR: { passed: false, message: 'Test suite error' },
          errorHandling: { passed: false, message: 'Test suite error' }
        },
        overallScore: 0,
        recommendations: ['Test suite execution failed. Check Edge Function deployment.']
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setProgress(0);
    }
  };

  const getTestIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          OCR Test Suite
          {results && (
            <Badge variant={results.success ? "default" : "destructive"} className="ml-auto">
              {results.overallScore}% Score
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Controls */}
        <div className="flex gap-2">
          <Button
            onClick={runTestSuite}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test Suite
              </>
            )}
          </Button>
          
          {results && (
            <Button
              variant="outline"
              onClick={() => setResults(null)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {currentTest}
            </p>
          </div>
        )}

        {/* Test Results */}
        {results && (
          <div className="space-y-4">
            {/* Overall Score */}
            <Alert variant={results.success ? "default" : "destructive"}>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Overall System Health: <span className={getScoreColor(results.overallScore)}>
                      {results.overallScore}%
                    </span>
                  </span>
                  {results.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Individual Test Results */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Test Results:</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {getTestIcon(results.tests.environmentCheck.passed)}
                    <span className="text-sm">Environment Check</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {results.tests.environmentCheck.message}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {getTestIcon(results.tests.apiConnectivity.passed)}
                    <span className="text-sm">API Connectivity</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {results.tests.apiConnectivity.message}
                    {results.tests.apiConnectivity.responseTime && (
                      ` (${results.tests.apiConnectivity.responseTime}ms)`
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {getTestIcon(results.tests.imageOCR.passed)}
                    <span className="text-sm">Image OCR</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {results.tests.imageOCR.message}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {getTestIcon(results.tests.errorHandling.passed)}
                    <span className="text-sm">Error Handling</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {results.tests.errorHandling.message}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {results.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recommendations:</h4>
                <div className="space-y-1">
                  {results.recommendations.map((rec, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      • {rec}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test History */}
        {testHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Test History
            </h4>
            <div className="space-y-1">
              {testHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                  <span>{entry.timestamp.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <span className={getScoreColor(entry.score)}>{entry.score}%</span>
                    {entry.success ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
