
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Settings, TestTube, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APIKeyManager } from "./APIKeyManager";
import { ErrorHandler } from "./ErrorHandler";
import { TestSuite } from "./TestSuite";
import { OCRDebugUtils, DebugResult, TestResult } from "@/utils/ocrDebug";

interface DebugDashboardProps {
  className?: string;
}

export function DebugDashboard({ className }: DebugDashboardProps) {
  const [systemStatus, setSystemStatus] = useState<DebugResult | null>(null);
  const [lastTestResult, setLastTestResult] = useState<TestResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errors, setErrors] = useState<Array<{ id: string; error: any }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    refreshSystemStatus();
  }, []);

  const refreshSystemStatus = async () => {
    setIsRefreshing(true);
    try {
      const diagnostics = await OCRDebugUtils.runSystemDiagnostics();
      setSystemStatus(diagnostics);
      
      if (!diagnostics.success) {
        toast({
          title: "⚠️ System Issues Detected",
          description: "OCR system requires attention. Check the diagnostics below.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to refresh system status:', error);
      toast({
        title: "❌ Status Check Failed",
        description: "Failed to check system status. Ensure Edge Functions are deployed.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestComplete = (result: TestResult) => {
    setLastTestResult(result);
    
    if (!result.success) {
      const errorId = `test-${Date.now()}`;
      setErrors(prev => [{
        id: errorId,
        error: {
          message: `Test suite failed with ${result.overallScore}% score`,
          code: result.overallScore < 50 ? 500 : 422,
          timestamp: new Date(),
          context: 'Test Suite'
        }
      }, ...prev.slice(0, 2)]);
    }
  };

  const clearError = (errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  };

  const getOverallHealthStatus = () => {
    if (!systemStatus) return { status: 'unknown', color: 'secondary' as const };
    
    const isHealthy = systemStatus.success && 
                     systemStatus.environment.ocrApiKeyExists && 
                     systemStatus.ocrSpaceTest.success;
                     
    if (isHealthy) return { status: 'healthy', color: 'default' as const };
    if (systemStatus.environment.ocrApiKeyExists) return { status: 'warning', color: 'secondary' as const };
    return { status: 'error', color: 'destructive' as const };
  };

  const healthStatus = getOverallHealthStatus();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              OCR System Dashboard
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={healthStatus.color}>
                {healthStatus.status.toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSystemStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {/* System Status Overview */}
              {systemStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">API Key</p>
                          <p className="text-xs text-muted-foreground">
                            {systemStatus.environment.ocrApiKeyExists ? 'Configured' : 'Missing'}
                          </p>
                        </div>
                        {systemStatus.environment.ocrApiKeyExists ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">API Connection</p>
                          <p className="text-xs text-muted-foreground">
                            {systemStatus.ocrSpaceTest.success ? 'Connected' : 'Failed'}
                            {systemStatus.ocrSpaceTest.responseTime && (
                              ` (${systemStatus.ocrSpaceTest.responseTime}ms)`
                            )}
                          </p>
                        </div>
                        {systemStatus.ocrSpaceTest.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Test Score</p>
                          <p className="text-xs text-muted-foreground">
                            {lastTestResult ? `${lastTestResult.overallScore}%` : 'Not tested'}
                          </p>
                        </div>
                        {lastTestResult?.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <TestTube className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recommendations */}
              {systemStatus?.recommendations && systemStatus.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">System Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {systemStatus.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[1.5rem]">{index + 1}.</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="config">
              <APIKeyManager onKeyUpdated={refreshSystemStatus} />
            </TabsContent>
            
            <TabsContent value="testing">
              <TestSuite onTestComplete={handleTestComplete} />
            </TabsContent>
            
            <TabsContent value="errors">
              <div className="space-y-4">
                {errors.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent errors detected</p>
                    </CardContent>
                  </Card>
                ) : (
                  errors.map((errorItem) => (
                    <ErrorHandler
                      key={errorItem.id}
                      error={errorItem.error}
                      onRetry={() => refreshSystemStatus()}
                      onClear={() => clearError(errorItem.id)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
