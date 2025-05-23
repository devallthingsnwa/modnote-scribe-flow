
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";
import { useNote, useUpdateNote, useDeleteNote } from "@/lib/api";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { TranscriptPanel } from "@/components/video/TranscriptPanel";
import { AISummaryPanel } from "@/components/video/AISummaryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getYoutubeVideoId } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
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
    if (playerRef.current) {
      playerRef.current.seekTo(timestamp);
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
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold ml-2">
                {isLoading ? "Loading..." : note?.title || "Untitled Note"}
              </h1>
              
              {note?.source_url && (
                <a 
                  href={note.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-muted-foreground flex items-center hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Source
                </a>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isLoading && note && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleSave(note)}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse">Loading note...</div>
            </div>
          ) : note ? (
            isVideoNote ? (
              <div className="flex flex-col h-full">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 pt-4 border-b">
                    <TabsList>
                      <TabsTrigger value="editor">Note Editor</TabsTrigger>
                      <TabsTrigger value="video">Video & Transcript</TabsTrigger>
                      <TabsTrigger value="summary">AI Summary</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    <TabsContent value="editor" className="m-0 h-full">
                      <NoteEditor 
                        initialNote={{
                          id: note.id,
                          title: note.title,
                          content: note.content,
                          tags: note.tags.map(tag => tag.id),
                        }} 
                        onSave={handleSave}
                      />
                    </TabsContent>
                    
                    <TabsContent value="video" className="m-0 h-full">
                      <div className="grid grid-cols-1 lg:grid-cols-2 h-full gap-4 p-4">
                        <Card className="p-4 h-full flex flex-col overflow-hidden">
                          <h3 className="text-lg font-medium mb-4">Video Player</h3>
                          <div className="flex-1 overflow-hidden">
                            <VideoPlayer 
                              videoId={videoId || ''} 
                              playerRef={playerRef}
                              onTimeUpdate={setCurrentTimestamp}
                            />
                          </div>
                        </Card>
                        
                        <Card className="p-4 h-full flex flex-col overflow-hidden">
                          <h3 className="text-lg font-medium mb-4">Transcript</h3>
                          <div className="flex-1 overflow-auto">
                            <TranscriptPanel
                              transcript={note.content || ''}
                              currentTime={currentTimestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="summary" className="m-0 h-full">
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
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            ) : (
              <NoteEditor 
                initialNote={{
                  id: note.id,
                  title: note.title,
                  content: note.content,
                  tags: note.tags.map(tag => tag.id),
                }} 
                onSave={handleSave}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div>Note not found</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
