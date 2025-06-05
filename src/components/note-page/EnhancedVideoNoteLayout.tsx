
import { useState, useRef } from "react";
import { Clock, Play, FileText, MessageSquare, Download, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { TranscriptPanel } from "@/components/video/TranscriptPanel";
import { NoteEditor } from "@/components/NoteEditor";
import { ExportPanel } from "@/components/ExportPanel";
import { DeepResearchPanel } from "@/components/research/DeepResearchPanel";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [activeTab, setActiveTab] = useState<string>("transcript");
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isRefreshingTranscript, setIsRefreshingTranscript] = useState<boolean>(false);
  const playerRef = useRef<any>(null);

  const handleTimestampClick = (timestamp: number) => {
    setCurrentTimestamp(timestamp);
    if (playerRef.current && isVideoReady) {
      try {
        playerRef.current.seekTo(timestamp);
        console.log(`Seeking to timestamp: ${timestamp}`);
        toast({
          title: "Jumped to timestamp",
          description: `Now playing at ${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`,
        });
      } catch (error) {
        console.error("Error seeking to timestamp:", error);
        toast({
          title: "Seek failed",
          description: "Unable to jump to the selected timestamp.",
          variant: "destructive",
        });
      }
    }
  };

  const handleTranscriptRefresh = async () => {
    if (!videoId || !note.id) return;
    
    setIsRefreshingTranscript(true);
    
    try {
      console.log("Refreshing transcript for video:", videoId);
      
      const { data: transcriptResult, error: transcriptError } = await supabase.functions.invoke('fetch-youtube-transcript', {
        body: { 
          videoId,
          options: {
            includeTimestamps: true,
            language: 'en',
            maxRetries: 2
          }
        }
      });
      
      if (transcriptError) {
        throw new Error(`Function error: ${transcriptError.message}`);
      }
      
      if (transcriptResult?.transcript) {
        const currentTitle = note?.title || `YouTube Video ${videoId}`;
        const newContent = `# 🎥 ${currentTitle}\n\n**Source:** ${note?.source_url}\n**Type:** Video Transcript\n**Last Updated:** ${new Date().toLocaleString()}\n\n---\n\n## 📝 Transcript\n\n${transcriptResult.transcript}`;
        
        updateNoteMutation.mutate({
          id: note.id,
          updates: {
            content: newContent,
            updated_at: new Date().toISOString(),
          },
        });
        
        toast({
          title: "✅ Transcript updated!",
          description: `Successfully fetched transcript with enhanced accuracy.`,
        });
      } else {
        throw new Error('No transcript data received');
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      toast({
        title: "Transcript fetch failed",
        description: `Could not fetch the transcript: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRefreshingTranscript(false);
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left Panel: Video & Transcript */}
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
                      description: "You can now watch the video and interact with timestamps.",
                    });
                  }}
                />
              </CardContent>
            </Card>
            
            {/* Enhanced Interactive Transcript */}
            <Card className="flex-1 overflow-hidden border-border/50 shadow-lg">
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Interactive Transcript
                  </h3>
                  <div className="flex items-center gap-2">
                    {isVideoReady && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        <Play className="h-3 w-3 mr-1" />
                        Click to jump
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleTranscriptRefresh}
                      disabled={isRefreshingTranscript}
                      className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      {isRefreshingTranscript ? (
                        <>
                          <div className="h-4 w-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mr-2" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <TranscriptPanel
                    transcript={note.content || ''}
                    currentTime={currentTimestamp}
                    onTimestampClick={handleTimestampClick}
                  />
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
              <TabsList className="bg-background/50 border border-border/50 grid w-full grid-cols-4">
                <TabsTrigger 
                  value="transcript" 
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
              <TabsContent value="transcript" className="m-0 h-full">
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
