import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useToast } from "@/hooks/use-toast";
import { useNote, useUpdateNote, useDeleteNote } from "@/lib/api";
import { getYoutubeVideoId } from "@/lib/utils";
import { NotePageHeader } from "@/components/note-page/NotePageHeader";
import { EnhancedVideoNoteLayout } from "@/components/note-page/EnhancedVideoNoteLayout";
import { RegularNoteLayout } from "@/components/note-page/RegularNoteLayout";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("summary");
  
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

  const handleExport = () => {
    setActiveTab("export");
  };

  const handleSaveNote = () => {
    if (note) {
      handleSave({
        title: note.title,
        content: note.content,
        tags: note.tags.map(tag => tag.id)
      });
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
        <NotePageHeader
          isLoading={isLoading}
          note={note}
          isVideoNote={isVideoNote}
          isVideoReady={true}
          onBack={handleBack}
          onSave={handleSaveNote}
          onDelete={handleDelete}
          onExport={handleExport}
        />
        
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
              <EnhancedVideoNoteLayout
                note={note}
                videoId={videoId || ''}
                updateNoteMutation={updateNoteMutation}
                onSave={handleSave}
              />
            ) : (
              <RegularNoteLayout
                note={note}
                onSave={handleSave}
              />
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
