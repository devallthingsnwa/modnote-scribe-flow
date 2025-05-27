import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ExternalLink, Save, Trash2, Play, Clock, FileText, Download, MessageSquare, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";
import { useNote, useUpdateNote, useDeleteNote } from "@/lib/api";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { TranscriptPanel } from "@/components/video/TranscriptPanel";
import { AISummaryPanel } from "@/components/video/AISummaryPanel";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { getYoutubeVideoId } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ExportPanel } from "@/components/ExportPanel";
import { supabase } from "@/integrations/supabase/client";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isRefreshingTranscript, setIsRefreshingTranscript] = useState<boolean>(false);
  const playerRef = useRef<any>(null);
  
  const { data: note, isLoading, error } = useNote(id || "");
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  
  const videoId = note?.source_url ? getYoutubeVideoId(note.source_url) : null;
  const isVideoNote = !!videoId && note?.is_transcription;

  const handleSave = (updatedNote: {
    title: string;
    content: string | null;
    tags: string[];
  }) => {
    if (!id) return;
    
    updateNoteMutation.mutate(
      {
        id,
        updates: {
          title: updatedNote.title,
          content: updatedNote.content,
          updated_at: new Date().toISOString(),
        },
        tagIds: updatedNote.tags,
      },
      {
        onSuccess: () => {
          toast({
            title: "Note saved",
            description: "Your note has been saved successfully.",
          });
        },
        onError: (error) => {
          toast({
            title: "Error saving note",
            description: "There was an error saving your note. Please try again.",
            variant: "destructive",
          });
          console.error("Save note error:", error);
        },
      }
    );
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleDelete = () => {
    if (!id) return;
    
    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      deleteNoteMutation.mutate(id, {
        onSuccess: () => {
          toast({
            title: "Note deleted",
            description: "Your note has been deleted successfully.",
          });
          navigate("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Error deleting note",
            description: "There was an error deleting your note. Please try again.",
            variant: "destructive",
          });
          console.error("Delete note error:", error);
        },
      });
    }
  };
  
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
    } else {
      toast({
        title: "Video not ready",
        description: "Please wait for the video to load before seeking.",
        variant: "destructive",
      });
    }
  };

  const handleTranscriptRefresh = async () => {
    if (!videoId || !id) return;
    
    setIsRefreshingTranscript(true);
    
    try {
      console.log("Refreshing transcript for video:", videoId);
      
      // First try with our edge function
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
        // Update the note content with the new transcript
        const currentTitle = note?.title || `YouTube Video ${videoId}`;
        const newContent = `# 🎥 ${currentTitle}\n\n**Source:** ${note?.source_url}\n**Type:** Video Transcript\n**Last Updated:** ${new Date().toLocaleString()}\n\n---\n\n## 📝 Transcript\n\n${transcriptResult.transcript}`;
        
        updateNoteMutation.mutate({
          id,
          updates: {
            content: newContent,
            updated_at: new Date().toISOString(),
          },
        });
        
        toast({
          title: "Transcript updated!",
          description: `Successfully fetched transcript with ${transcriptResult.metadata?.segments || 'unknown'} segments.`,
        });
      } else {
        throw new Error('No transcript data received');
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      
      // Try direct API call as fallback
      try {
        const response = await fetch(`https://rqxhgeujepdhhzoaeomu.supabase.co/functions/v1/fetch-youtube-transcript`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxeGhnZXVqZXBkaGh6b2Flb211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5Mjg4MjMsImV4cCI6MjA2MzUwNDgyM30.nXAsuClyrleY5I55yXBFH0q0L3KY6K7utBfv98UjJmk`,
          },
          body: JSON.stringify({ videoId }),
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.transcript) {
          // Update the note content with the new transcript
          const currentTitle = note?.title || `YouTube Video ${videoId}`;
          const newContent = `# 🎥 ${currentTitle}\n\n**Source:** ${note?.source_url}\n**Type:** Video Transcript\n**Last Updated:** ${new Date().toLocaleString()}\n\n---\n\n## 📝 Transcript\n\n${data.transcript}`;
          
          updateNoteMutation.mutate({
            id,
            updates: {
              content: newContent,
              updated_at: new Date().toISOString(),
            },
          });
          
          toast({
            title: "Transcript updated!",
            description: `Successfully fetched transcript with ${data.metadata?.segments || 'unknown'} segments.`,
          });
        } else {
          throw new Error('No transcript data received from direct API call');
        }
      } catch (fallbackError) {
        console.error("Fallback transcript fetch failed:", fallbackError);
        toast({
          title: "Transcript fetch failed",
          description: `Could not fetch the transcript: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsRefreshingTranscript(false);
    }
  };

  if (error) {
    toast({
      title: "Error loading note",
      description: "The requested note could not be found.",
      variant: "destructive",
    });
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBack}
                  className="hover:bg-muted/80 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center space-x-3">
                  {isVideoNote && (
                    <div className="bg-red-500/10 p-2 rounded-lg">
                      <Play className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                      {isLoading ? (
                        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                      ) : (
                        note?.title || "Untitled Note"
                      )}
                    </h1>
                    
                    {note?.source_url && (
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Video Note
                        </Badge>
                        <a 
                          href={note.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                        >
                          <Youtube className="h-3 w-3 mr-1" />
                          Watch on YouTube
                        </a>
                        {isVideoReady && (
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            Video Ready
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Enhanced Action Buttons */}
              <div className="flex items-center gap-2">
                {!isLoading && note && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab("export")}
                      className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSave({
                        title: note.title,
                        content: note.content,
                        tags: note.tags.map(tag => tag.id)
                      })}
                      className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Note
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDelete}
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading your note...</p>
              </div>
            </div>
          ) : note ? (
            isVideoNote ? (
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Panel: Video + Transcript */}
                <ResizablePanel defaultSize={40} minSize={30}>
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
                                title: "Video player ready!",
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
                            <h3 className="text-lg font-semibold text-foreground">Interactive Transcript</h3>
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
                                    Refresh Transcript
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
                
                {/* Right Panel: AI Analysis */}
                <ResizablePanel defaultSize={60} minSize={40}>
                  <div className="h-full flex flex-col">
                    <div className="bg-muted/30 px-6 py-3 border-b border-border/50">
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-background/50 border border-border/50 grid w-full grid-cols-4">
                          <TabsTrigger 
                            value="summary" 
                            className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Summary
                          </TabsTrigger>
                          <TabsTrigger 
                            value="chat"
                            className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            AI Chat
                          </TabsTrigger>
                          <TabsTrigger 
                            value="notes"
                            className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Notes
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
                        <TabsContent value="summary" className="m-0 h-full">
                          <div className="p-6 h-full">
                            <AISummaryPanel
                              noteId={note.id}
                              content={note.content || ''}
                              onSummaryGenerated={(summary) => {
                                if (!id) return;
                                updateNoteMutation.mutate({
                                  id,
                                  updates: {
                                    content: summary,
                                    updated_at: new Date().toISOString(),
                                  },
                                });
                              }}
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="chat" className="m-0 h-full">
                          <div className="p-6 h-full">
                            <AIChatPanel
                              noteId={note.id}
                              content={note.content || ''}
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="notes" className="m-0 h-full">
                          <div className="p-6 h-full">
                            <NoteEditor 
                              initialNote={{
                                id: note.id,
                                title: note.title,
                                content: note.content,
                                tags: note.tags.map(tag => tag.id),
                              }} 
                              onSave={handleSave}
                            />
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
            ) : (
              <div className="p-6 h-full">
                <NoteEditor 
                  initialNote={{
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    tags: note.tags.map(tag => tag.id),
                  }} 
                  onSave={handleSave}
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="bg-muted/50 rounded-full p-6">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                </div>
                <p className="text-muted-foreground">Note not found</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
