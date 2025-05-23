
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, List, FileText, CheckCircle, Loader2, Brain, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AISummaryPanelProps {
  noteId: string;
  content: string;
  onSummaryGenerated?: (summary: string) => void;
}

export function AISummaryPanel({ noteId, content, onSummaryGenerated }: AISummaryPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryType, setSummaryType] = useState<string>("full");
  const [summary, setSummary] = useState<string | null>(null);
  const [keyPoints, setKeyPoints] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSummary = async () => {
    if (!content || content.length < 50) {
      toast({
        title: "Content too short",
        description: "Please provide more content to generate a summary.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-content-with-deepseek", {
        body: {
          content,
          type: "video",
          options: {
            summary: true,
            keyPoints: true,
            highlights: true
          }
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.processedContent) {
        // Parse different sections from the response
        const processedText = data.processedContent;
        
        // Set the entire processed content as summary for now
        setSummary(processedText);
        
        // Extract key points if available
        const keyPointsMatch = processedText.match(/(?:##|###) Key Points[\s\S]*?(?=(?:##|###)|$)/i);
        if (keyPointsMatch) {
          setKeyPoints(keyPointsMatch[0]);
        }
        
        // Extract highlights if available
        const highlightsMatch = processedText.match(/(?:##|###) Key Highlights[\s\S]*?(?=(?:##|###)|$)/i);
        if (highlightsMatch) {
          setHighlights(highlightsMatch[0]);
        }
        
        // Let the parent component know we have a summary
        if (onSummaryGenerated) {
          onSummaryGenerated(processedText);
        }
        
        toast({
          title: "Summary generated",
          description: "AI summary has been successfully generated.",
        });
      } else {
        throw new Error("No processed content returned");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error generating summary",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Summary</h2>
              <p className="text-sm text-muted-foreground">
                Generate intelligent insights from your video content
              </p>
            </div>
          </div>
          
          <Button 
            onClick={generateSummary}
            disabled={isProcessing || !content || content.length < 50}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center space-x-3">
          <Badge 
            variant={content ? "default" : "secondary"} 
            className={content ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {content ? `${Math.floor(content.length / 1000)}k characters` : "No content"}
          </Badge>
          
          {summary && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Summary Ready
            </Badge>
          )}
        </div>
      </div>
      
      {!summary && !isProcessing ? (
        <Card className="flex-1 bg-gradient-to-br from-background via-muted/20 to-primary/5 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full p-6">
              <Brain className="h-12 w-12 text-purple-600 dark:text-purple-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Ready to Generate AI Summary</h3>
              <p className="text-muted-foreground max-w-md">
                Transform your video content into structured insights with AI-powered analysis
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-3">
                  <FileText className="h-6 w-6 text-blue-600 mx-auto" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">Full Summary</div>
                  <div>Comprehensive overview</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3">
                  <List className="h-6 w-6 text-green-600 mx-auto" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">Key Points</div>
                  <div>Main takeaways</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-3">
                  <Lightbulb className="h-6 w-6 text-yellow-600 mx-auto" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">Highlights</div>
                  <div>Important moments</div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={generateSummary}
              disabled={isProcessing || !content || content.length < 50}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Summary
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          <Tabs value={summaryType} onValueChange={setSummaryType} className="flex-1 flex flex-col">
            <TabsList className="bg-muted/50 border border-border/50">
              <TabsTrigger 
                value="full" 
                className="flex items-center data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Full Summary
              </TabsTrigger>
              <TabsTrigger 
                value="key-points" 
                className="flex items-center data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <List className="h-4 w-4 mr-2" />
                Key Points
              </TabsTrigger>
              <TabsTrigger 
                value="highlights" 
                className="flex items-center data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Highlights
              </TabsTrigger>
            </TabsList>
            
            <Card className="flex-1 border-border/50 shadow-lg">
              <CardContent className="p-6 h-full">
                {isProcessing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="h-16 w-16 border-4 border-purple-200 dark:border-purple-800 rounded-full mx-auto" />
                        <div className="h-16 w-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Generating AI summary...</p>
                        <p className="text-sm text-muted-foreground">This may take a few moments</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <TabsContent value="full" className="mt-0 h-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {summary ? (
                          <div 
                            className="space-y-4 text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: summary.replace(/\n/g, "<br />").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            }} 
                          />
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p>No summary available.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="key-points" className="mt-0 h-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {keyPoints ? (
                          <div 
                            className="space-y-4 text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: keyPoints.replace(/\n/g, "<br />").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            }} 
                          />
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <List className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p>No key points available.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="highlights" className="mt-0 h-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {highlights ? (
                          <div 
                            className="space-y-4 text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: highlights.replace(/\n/g, "<br />").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            }} 
                          />
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <CheckCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p>No highlights available.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </div>
      )}
    </div>
  );
}
