
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";
import { useNote, useUpdateNote, useDeleteNote } from "@/lib/api";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: note, isLoading, error } = useNote(id || "");
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

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
            </div>
            
            {!isLoading && note && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete Note
              </Button>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse">Loading note...</div>
            </div>
          ) : note ? (
            <NoteEditor 
              initialNote={{
                id: note.id,
                title: note.title,
                content: note.content,
                tags: note.tags.map(tag => tag.id),
              }} 
              onSave={handleSave}
            />
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
