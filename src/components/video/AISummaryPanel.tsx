
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, List, FileText, CheckCircle, Loader2 } from "lucide-react";
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
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          AI Summary
        </h2>
        
        <Button 
          onClick={generateSummary}
          disabled={isProcessing || !content || content.length < 50}
          className="flex items-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Summary
            </>
          )}
        </Button>
      </div>
      
      {!summary && !isProcessing ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center p-6">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Summary Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Click the "Generate Summary" button to create an AI-powered summary of your video content.
            </p>
            <Button 
              onClick={generateSummary}
              disabled={isProcessing || !content || content.length < 50}
            >
              Generate Summary
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col">
          <Tabs value={summaryType} onValueChange={setSummaryType} className="flex-1 flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="full" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Full Summary
              </TabsTrigger>
              <TabsTrigger value="key-points" className="flex items-center">
                <List className="h-4 w-4 mr-2" />
                Key Points
              </TabsTrigger>
              <TabsTrigger value="highlights" className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Highlights
              </TabsTrigger>
            </TabsList>
            
            <Card className="flex-1">
              <CardContent className="p-4 h-full">
                {isProcessing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                      <p className="text-muted-foreground">Generating AI summary...</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <TabsContent value="full" className="mt-0 h-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {summary ? (
                          <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, "<br />") }} />
                        ) : (
                          <p className="text-muted-foreground">No summary available.</p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="key-points" className="mt-0 h-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {keyPoints ? (
                          <div dangerouslySetInnerHTML={{ __html: keyPoints.replace(/\n/g, "<br />") }} />
                        ) : (
                          <p className="text-muted-foreground">No key points available.</p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="highlights" className="mt-0 h-full">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {highlights ? (
                          <div dangerouslySetInnerHTML={{ __html: highlights.replace(/\n/g, "<br />") }} />
                        ) : (
                          <p className="text-muted-foreground">No highlights available.</p>
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
