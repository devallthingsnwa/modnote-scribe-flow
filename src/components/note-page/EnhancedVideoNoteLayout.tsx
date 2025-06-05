
import { useState, useRef } from "react";
import { Clock, Play, FileText, MessageSquare, Download, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { NoteEditor } from "@/components/NoteEditor";
import { ExportPanel } from "@/components/ExportPanel";
import { DeepResearchPanel } from "@/components/research/DeepResearchPanel";
import { useToast } from "@/hooks/use-toast";

interface EnhancedVideoNoteLayoutProps {
  note: any;
  videoId: string;
  updateNoteMutation: any;
  onSave: (updatedNote: any) => void;
}

export function EnhancedVideoNoteLayout({ 
  note, 
  videoId, 
  updateNoteMutation, 
  onSave 
}: EnhancedVideoNoteLayoutProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("notes");
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const playerRef = useRef<any>(null);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left Panel: Video */}
      <ResizablePanel defaultSize={45} minSize={35}>
        <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/10">
          <div className="p-6 flex-1 overflow-auto space-y-6">
            {/* Enhanced Video Player */}
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <CardContent className="p-6">
                <VideoPlayer 
                  videoId={videoId || ''} 
                  playerRef={playerRef}
                  onTimeUpdate={setCurrentTimestamp}
                  onReady={() => {
                    setIsVideoReady(true);
                    toast({
                      title: "✅ Video player ready!",
                      description: "You can now watch the video.",
                    });
                  }}
                />
              </CardContent>
            </Card>
            
            {/* Video Info */}
            <Card className="flex-1 overflow-hidden border-border/50 shadow-lg">
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Video Notes
                  </h3>
                  {isVideoReady && (
                    <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                      <Play className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground">
                      Use the Notes tab on the right to add your thoughts and observations about this video.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      {/* Right Panel: Enhanced Tabs */}
      <ResizablePanel defaultSize={55} minSize={40}>
        <div className="h-full flex flex-col">
          <div className="bg-muted/30 px-6 py-3 border-b border-border/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-background/50 border border-border/50 grid w-full grid-cols-3">
                <TabsTrigger 
                  value="notes" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Notes
                </TabsTrigger>
                <TabsTrigger 
                  value="research"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Research
                </TabsTrigger>
                <TabsTrigger 
                  value="export"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/10">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="notes" className="m-0 h-full">
                <div className="p-6 h-full">
                  <NoteEditor 
                    initialNote={{
                      id: note.id,
                      title: note.title,
                      content: note.content,
                      tags: note.tags.map(tag => tag.id),
                    }} 
                    onSave={onSave}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="research" className="m-0 h-full">
                <div className="p-6 h-full">
                  <DeepResearchPanel />
                </div>
              </TabsContent>
              
              <TabsContent value="export" className="m-0 h-full">
                <div className="p-6 h-full">
                  <ExportPanel
                    note={{
                      title: note.title,
                      content: note.content || '',
                      tags: note.tags.map(tag => tag.name),
                      source_url: note.source_url
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
