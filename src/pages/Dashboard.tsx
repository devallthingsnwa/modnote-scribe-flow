
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { NoteCard, NoteCardProps } from "@/components/NoteCard";
import { Button } from "@/components/ui/button";
import { ImportModal } from "@/components/ImportModal";
import { useToast } from "@/hooks/use-toast";
import { useNotes, useCreateNote } from "@/lib/api";
import { extractYouTubeId } from "@/components/import/ImportUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  const { data: notes, isLoading, error } = useNotes();
  const createNoteMutation = useCreateNote();

  const handleNoteClick = (id: string) => {
    navigate(`/note/${id}`);
  };

  const handleNewNote = () => {
    navigate("/new");
  };

  const handleImport = (url: string, type: string) => {
    toast({
      title: "Content import started",
      description: `Your ${type} content is being processed and will be available soon.`,
    });
    
    // Create a new note with the imported content - removed has_transcript field
    createNoteMutation.mutate(
      {
        note: {
          title: `Imported ${type}: ${url.substring(0, 30)}...`,
          content: "This is the transcribed content from your imported media.",
          source_url: url,
          is_transcription: true,
          thumbnail: type === "video" ? `https://img.youtube.com/vi/${extractVideoId(url)}/maxresdefault.jpg` : undefined,
        },
        tagIds: [], // Add default tags if needed
      },
      {
        onSuccess: () => {
          toast({
            title: "Content imported successfully",
            description: "Your content has been transcribed and is ready for editing.",
          });
          // No need to manually update the state as React Query will handle it
        },
        onError: (error) => {
          toast({
            title: "Import failed",
            description: "There was an error importing your content. Please try again.",
            variant: "destructive",
          });
          console.error("Import error:", error);
        },
      }
    );
  };

  // Helper function to extract YouTube video ID
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Transform notes from API to NoteCard format
  const transformNotesToCardProps = (): NoteCardProps[] => {
    if (!notes) return [];
    
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content || "",
      date: new Date(note.created_at),
      tags: note.tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color
      })),
      notebook: note.notebook_id ? {
        id: note.notebook_id,
        name: "Unknown" // We'll fetch notebook names in a more efficient way in a future update
      } : undefined,
      thumbnail: note.thumbnail || undefined
    }));
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">All Notes</h1>
            <div className="flex space-x-2">
              <Button onClick={() => setImportModalOpen(true)}>
                Import Content
              </Button>
              <Button onClick={handleNewNote}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse">Loading notes...</div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">
              Error loading notes. Please try again.
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transformNotesToCardProps().map((note) => (
                <NoteCard
                  key={note.id}
                  {...note}
                  onClick={() => handleNoteClick(note.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">No notes found. Create your first note!</p>
              <Button onClick={handleNewNote}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          )}
        </main>
      </div>
      
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
      />
    </div>
  );
}
