
import { useState, useEffect } from "react";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDeepResearch } from "@/hooks/useDeepResearch";
import { SearchInterface } from "@/components/research/SearchInterface";
import { ChatInterface } from "@/components/research/ChatInterface";
import { PerformanceMetrics } from "@/components/research/PerformanceMetrics";
import { ModeToggle } from "@/components/research/ModeToggle";
import { OptimizedSearchService } from "@/lib/aiResearch/searchService";

export function DeepResearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    searchQuery,
    searchResults,
    chatMessages,
    isLoading,
    isChatMode,
    chatInput,
    setChatInput,
    metrics,
    streamingContent,
    handleSearch,
    handleChatSubmit,
    cancelRequest,
    toggleMode,
    clearChat,
    abortControllerRef
  } = useDeepResearch();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      OptimizedSearchService.clearCache();
    };
  }, [abortControllerRef]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 py-1 h-auto">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Ultra AI Research</span>
            {metrics && (
              <Badge variant="outline" className="text-xs h-4 px-1">
                {metrics.totalTime.toFixed(0)}ms
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-2 mt-2">
        <Card className="shadow-sm border-2">
          <CardHeader className="p-3 pb-2">
            <ModeToggle
              isChatMode={isChatMode}
              searchResultsCount={searchResults.length}
              chatMessagesCount={chatMessages.length}
              onToggle={toggleMode}
              onClearChat={clearChat}
            />
          </CardHeader>
          
          <CardContent className="p-3 pt-0">
            {!isChatMode ? (
              <SearchInterface
                searchQuery={searchQuery}
                searchResults={searchResults}
                onSearch={handleSearch}
              />
            ) : (
              <>
                <ChatInterface
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  isLoading={isLoading}
                  streamingContent={streamingContent}
                  onSubmit={handleChatSubmit}
                  onCancel={cancelRequest}
                />
                <PerformanceMetrics metrics={metrics} />
              </>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
