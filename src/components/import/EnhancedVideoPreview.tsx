import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, FileText, Sparkles, Clock, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface EnhancedVideoPreviewProps {
  thumbnail: string | null;
  transcript: string | null;
  url: string;
  enableSummary: boolean;
  enableHighlights: boolean;
  enableKeyPoints: boolean;
  onSummaryChange: (checked: boolean) => void;
  onHighlightsChange: (checked: boolean) => void;
  onKeyPointsChange: (checked: boolean) => void;
  metadata?: any;
}

export function EnhancedVideoPreview({
  thumbnail,
  transcript,
  url,
  enableSummary,
  enableHighlights,
  enableKeyPoints,
  onSummaryChange,
  onHighlightsChange,
  onKeyPointsChange,
  metadata
}: EnhancedVideoPreviewProps) {
  const [activeTab, setActiveTab] = useState("preview");

  if (!thumbnail && !transcript) return null;

  // Extract video title from metadata or URL
  const getVideoTitle = () => {
    if (metadata?.title) {
      return metadata.title;
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "YouTube Video Import";
    }
    return "Video Content";
  };

  const transcriptLines = transcript ? transcript.split('\n') : [];
  const displayLines = transcriptLines.slice(0, 15);
  const hasMoreLines = transcriptLines.length > 15;
  const estimatedDuration = metadata?.duration || (transcript ? Math.ceil(transcript.length / 1000) : 0);

  return (
    <Card className="w-full border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-500 p-2 rounded-lg">
                <Play className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{getVideoTitle()}</h3>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  {metadata?.author && (
                    <span>by {metadata.author}</span>
                  )}
                  {estimatedDuration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{typeof estimatedDuration === 'string' ? estimatedDuration : `~${estimatedDuration} min`}</span>
                    </div>
                  )}
                  {transcript && (
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>Transcript Available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Eye className="h-3 w-3 mr-1" />
              Ready to Import
            </Badge>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="preview" className="text-xs">
                Preview
              </TabsTrigger>
              <TabsTrigger value="transcript" className="text-xs">
                Transcript
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs">
                AI Analysis
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="preview" className="mt-0">
              {thumbnail && (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg border border-border group">
                    <img 
                      src={thumbnail} 
                      alt="Video preview" 
                      className="w-full h-48 object-cover transition-transform group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-red-500 p-3 rounded-full">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Video thumbnail loaded successfully
                    {metadata?.viewCount && (
                      <span className="ml-2">• {metadata.viewCount} views</span>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-0">
              {transcript ? (
                <div className="space-y-3">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border max-h-48 overflow-y-auto">
                    <div className="text-xs font-mono space-y-1">
                      {displayLines.map((line, index) => (
                        <div key={index} className="leading-relaxed">
                          {line}
                        </div>
                      ))}
                      {hasMoreLines && (
                        <div className="text-muted-foreground italic pt-2">
                          ... and {transcriptLines.length - 15} more lines
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Transcript: {transcriptLines.length} lines</span>
                    <span>Characters: {transcript.length}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transcript available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">AI Processing Options</Label>
                </div>
                
                <div className="grid gap-4">
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="summary" 
                        checked={enableSummary}
                        onCheckedChange={onSummaryChange}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="summary" className="font-medium text-blue-900 dark:text-blue-100">
                          Summary
                        </Label>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Generate a comprehensive summary, highlights, and key insights.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="highlights" 
                        checked={enableHighlights}
                        onCheckedChange={onHighlightsChange}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="highlights" className="font-medium text-green-900 dark:text-green-100">
                          Key Highlights
                        </Label>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Extract the most important points, insights, or memorable moments.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="keypoints" 
                        checked={enableKeyPoints}
                        onCheckedChange={onKeyPointsChange}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="keypoints" className="font-medium text-purple-900 dark:text-purple-100">
                          Key Points
                        </Label>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          Generate a structured list of main takeaways and actionable insights.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {!transcript && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    AI analysis will be available once transcript is loaded
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
