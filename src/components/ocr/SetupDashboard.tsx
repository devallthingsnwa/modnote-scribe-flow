
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, Zap, TestTube, Wrench } from "lucide-react";
import { AutoSetupWizard } from "./AutoSetupWizard";
import { QuickFixActions } from "./QuickFixActions";
import { DebugDashboard } from "./DebugDashboard";
import { APIKeyManager } from "./APIKeyManager";
import { TestSuite } from "./TestSuite";
import { useToast } from "@/hooks/use-toast";

interface SetupDashboardProps {
  className?: string;
}

export function SetupDashboard({ className }: SetupDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<'unknown' | 'healthy' | 'warning' | 'error'>('unknown');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const checkSystemHealth = async () => {
    setIsRefreshing(true);
    try {
      // Simulate system health check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would check multiple systems
      const healthChecks = {
        edgeFunctions: Math.random() > 0.2,
        apiKey: Math.random() > 0.3,
        connectivity: Math.random() > 0.1,
        pipeline: Math.random() > 0.2
      };
      
      const healthyCount = Object.values(healthChecks).filter(Boolean).length;
      const totalChecks = Object.keys(healthChecks).length;
      
      if (healthyCount === totalChecks) {
        setSystemHealth('healthy');
      } else if (healthyCount >= totalChecks * 0.75) {
        setSystemHealth('warning');
      } else {
        setSystemHealth('error');
      }
      
      setLastCheck(new Date());
      
    } catch (error) {
      setSystemHealth('error');
      toast({
        title: "❌ Health Check Failed",
        description: "Could not complete system health check.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const getHealthColor = () => {
    switch (systemHealth) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthText = () => {
    switch (systemHealth) {
      case 'healthy': return '✅ All Systems Operational';
      case 'warning': return '⚠️ Some Issues Detected';
      case 'error': return '❌ System Needs Attention';
      default: return '🔄 Checking System Health...';
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              OCR Setup Dashboard
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getHealthColor()}>
                {getHealthText()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSystemHealth}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
          {lastCheck && (
            <p className="text-sm text-muted-foreground">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="auto-setup" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="auto-setup" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span className="hidden sm:inline">Auto Setup</span>
              </TabsTrigger>
              <TabsTrigger value="quick-fix" className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                <span className="hidden sm:inline">Quick Fix</span>
              </TabsTrigger>
              <TabsTrigger value="api-key" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                <span className="hidden sm:inline">API Key</span>
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-1">
                <TestTube className="h-3 w-3" />
                <span className="hidden sm:inline">Testing</span>
              </TabsTrigger>
              <TabsTrigger value="debug" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline">Debug</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="auto-setup" className="mt-6">
              <AutoSetupWizard 
                onComplete={() => {
                  setSystemHealth('healthy');
                  toast({
                    title: "🎉 Setup Complete!",
                    description: "Your OCR system is now fully configured.",
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="quick-fix" className="mt-6">
              <QuickFixActions 
                onActionComplete={(actionId, success) => {
                  if (success && actionId === 'test-ocr') {
                    checkSystemHealth();
                  }
                }}
              />
            </TabsContent>
            
            <TabsContent value="api-key" className="mt-6">
              <APIKeyManager 
                onKeyUpdated={() => {
                  checkSystemHealth();
                  toast({
                    title: "🔑 API Key Updated",
                    description: "OCR.space API key has been updated successfully.",
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="testing" className="mt-6">
              <TestSuite 
                onTestComplete={(result) => {
                  if (result.success) {
                    setSystemHealth('healthy');
                  } else if (result.overallScore >= 50) {
                    setSystemHealth('warning');
                  } else {
                    setSystemHealth('error');
                  }
                }}
              />
            </TabsContent>
            
            <TabsContent value="debug" className="mt-6">
              <DebugDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
