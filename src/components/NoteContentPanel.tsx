
import { useState, useEffect } from "react";
import { ChevronLeft, ExternalLink, Save, Trash2, FileText, Video, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NoteEditor } from "@/components/NoteEditor";
import { useNote, useUpdateNote, useDeleteNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NoteContentPanelProps {
  noteId: string | null;
  onBack: () => void;
  onNoteDeleted: () => void;
}

export function NoteContentPanel({ noteId, onBack, onNoteDeleted }: NoteContentPanelProps) {
  const { toast } = useToast();
  const { data: note, isLoading, error } = useNote(noteId || "");
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  const handleSave = (updatedNote: {
    title: string;
    content: string | null;
    tags: string[];
  }) => {
    if (!noteId) return;
    
    updateNoteMutation.mutate(
      {
        id: noteId,
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

  const handleDelete = () => {
    if (!noteId) return;
    
    if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      deleteNoteMutation.mutate(noteId, {
        onSuccess: () => {
          toast({
            title: "Note deleted",
            description: "Your note has been deleted successfully.",
          });
          onNoteDeleted();
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

  const formatNoteContent = (content: string | null, note: any) => {
    if (!content) return content;
    
    // If it's a video transcription, format it nicely
    if (note?.is_transcription && note?.source_url) {
      // Add video metadata header if not present
      if (!content.includes('**Source:**')) {
        const videoTitle = note.title || 'YouTube Video';
        const formattedContent = `# 🎥 ${videoTitle}\n\n` +
          `**Source:** ${note.source_url}\n` +
          `**Type:** Video Transcript\n\n` +
          `---\n\n` +
          `## 📝 Transcript\n\n${content}`;
        return formattedContent;
      }
    }
    
    return content;
  };

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center space-y-4 max-w-md">
          <div className="bg-muted/50 rounded-full p-8 mx-auto w-fit">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">Select a note to view</h3>
            <p className="text-sm text-muted-foreground">
              Choose a note from the list to start reading or editing. Your notes will appear here with full formatting and media support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-muted/50 rounded-full p-6">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
          </div>
          <p className="text-muted-foreground">Note not found</p>
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to notes
          </Button>
        </div>
      </div>
    );
  }

  const formattedContent = formatNoteContent(note.content, note);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="hover:bg-muted/80 transition-colors md:hidden flex-shrink-0 mt-1"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-start space-x-3 flex-1">
                {/* Note Type Indicator */}
                <div className="flex-shrink-0 mt-1">
                  {note.is_transcription ? (
                    <div className="bg-red-500/10 p-2 rounded-lg">
                      <Video className="h-5 w-5 text-red-500" />
                    </div>
                  ) : (
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight line-clamp-2">
                    {note.title || "Untitled Note"}
                  </h1>
                  
                  <div className="flex items-center mt-2 space-x-2 flex-wrap gap-y-1">
                    {note.is_transcription && (
                      <Badge variant="secondary" className="text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        Video Transcript
                      </Badge>
                    )}
                    
                    {note.source_url && (
                      <a 
                        href={note.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Source
                      </a>
                    )}
                    
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {note.tags.map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
                Save
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
            </div>
          </div>

          {/* Video Thumbnail (if available) */}
          {note.thumbnail && note.is_transcription && (
            <div className="mt-4">
              <Card className="overflow-hidden max-w-md">
                <div className="relative">
                  <img 
                    src={note.thumbnail} 
                    alt={note.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-2">
                      <Play className="h-6 w-6 text-black" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            <NoteEditor 
              initialNote={{
                id: note.id,
                title: note.title,
                content: formattedContent,
                tags: note.tags.map(tag => tag.id),
              }} 
              onSave={handleSave}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
