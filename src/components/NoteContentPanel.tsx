
import { useState, useEffect } from "react";
import { ChevronLeft, ExternalLink, Save, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NoteEditor } from "@/components/NoteEditor";
import { useNote, useUpdateNote, useDeleteNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <div className="bg-muted rounded-full p-6">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground font-medium">Select a note to view</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Choose a note from the list to start reading or editing
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="hover:bg-muted/80 transition-colors md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-3">
                {note.is_transcription && (
                  <div className="bg-red-500/10 p-2 rounded-lg">
                    <FileText className="h-4 w-4 text-red-500" />
                  </div>
                )}
                
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    {note.title || "Untitled Note"}
                  </h1>
                  
                  {note.source_url && (
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
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Source
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
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
    </div>
  );
}
