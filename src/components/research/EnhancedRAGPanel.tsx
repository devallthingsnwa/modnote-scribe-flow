
import { useState } from "react";
import { Search, Brain, Zap, Settings, TrendingUp, Database, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EnhancedChatInterface } from "./EnhancedChatInterface";
import { AdvancedSearchInterface } from "./AdvancedSearchInterface";
import { useEnhancedSemanticChat } from "@/hooks/useEnhancedSemanticChat";
import { useEnhancedSemanticSearch } from "@/hooks/useEnhancedSemanticSearch";

export function EnhancedRAGPanel() {
  const [activeMode, setActiveMode] = useState<'search' | 'chat'>('chat');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const chatHook = useEnhancedSemanticChat();
  const searchHook = useEnhancedSemanticSearch();
  
  const {
    chatMessages,
    isLoading,
    chatInput,
    setChatInput,
    metrics,
    searchStrategy,
    handleChatSubmit,
    cancelRequest,
    clearChat,
    switchSearchStrategy,
    cacheStats
  } = chatHook;
  
  const {
    searchQuery,
    searchResults,
    searchMetrics,
    handleSearch: handleEnhancedSearch,
    clearSearch
  } = searchHook;

  return (
    <Card className="h-full flex flex-col border-border/50 shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-6 w-6 text-purple-600" />
            Enhanced RAG System
            <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              v2.0
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="hover:bg-purple-50"
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hybrid AI search with semantic understanding and contextual intelligence
          </p>
          
          {/* Performance Metrics */}
          {(metrics || searchMetrics) && (
            <div className="flex items-center gap-3 text-xs">
              {metrics && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Zap className="h-3 w-3 mr-1" />
                  {metrics.totalTime.toFixed(0)}ms
                </Badge>
              )}
              {metrics?.contextQuality && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {(metrics.contextQuality * 100).toFixed(0)}% quality
                </Badge>
              )}
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                <Database className="h-3 w-3 mr-1" />
                {cacheStats.contextCache} cached
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <Tabs value={activeMode} onValueChange={(value: any) => setActiveMode(value)}>
              <TabsList className="grid w-48 grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Search
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Search Strategy Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Strategy:</span>
              <Select 
                value={searchStrategy} 
                onValueChange={(value: 'hybrid' | 'semantic' | 'keyword') => switchSearchStrategy(value)}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                      Hybrid
                    </div>
                  </SelectItem>
                  <SelectItem value="semantic">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Semantic
                    </div>
                  </SelectItem>
                  <SelectItem value="keyword">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Keyword
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Advanced Metrics */}
          {showAdvanced && metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Search Time</div>
                <div className="text-sm font-medium">{metrics.searchTime.toFixed(1)}ms</div>
                <Progress value={Math.min(metrics.searchTime / 10, 100)} className="h-1 mt-1" />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">API Time</div>
                <div className="text-sm font-medium">{metrics.apiTime.toFixed(1)}ms</div>
                <Progress value={Math.min(metrics.apiTime / 50, 100)} className="h-1 mt-1" />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Cache Hit</div>
                <div className="text-sm font-medium">{(metrics.cacheHitRate * 100).toFixed(0)}%</div>
                <Progress value={metrics.cacheHitRate * 100} className="h-1 mt-1" />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Strategy</div>
                <div className="text-sm font-medium capitalize">{metrics.searchStrategy}</div>
                <div className="h-1 mt-1 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-h-0">
          {activeMode === 'chat' ? (
            <EnhancedChatInterface
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isLoading={isLoading}
              onSubmit={handleChatSubmit}
              onCancel={cancelRequest}
              onClear={clearChat}
              metrics={metrics}
              searchStrategy={searchStrategy}
            />
          ) : (
            <AdvancedSearchInterface
              searchQuery={searchQuery}
              searchResults={searchResults}
              searchMetrics={searchMetrics}
              onSearch={handleEnhancedSearch}
              onClear={clearSearch}
              searchStrategy={searchStrategy}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
