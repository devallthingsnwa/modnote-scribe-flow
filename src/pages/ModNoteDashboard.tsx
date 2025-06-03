
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ModNoteHeader } from "@/components/modnote/ModNoteHeader";
import { ModNoteSidebar } from "@/components/modnote/ModNoteSidebar";
import { NotesListView } from "@/components/modnote/NotesListView";
import { NoteEditor } from "@/components/modnote/NoteEditor";
import { NotebooksView } from "@/components/modnote/NotebooksView";
import { FilesView } from "@/components/modnote/FilesView";
import { TagsView } from "@/components/modnote/TagsView";
import { SharedView } from "@/components/modnote/SharedView";
import { TrashView } from "@/components/modnote/TrashView";
import { useCreateModNote } from "@/lib/modNoteApi";
import { useToast } from "@/hooks/use-toast";

export default function ModNoteDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedSection, setSelectedSection] = useState("notes");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const createNoteMutation = useCreateModNote();

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  const handleNewNote = () => {
    // Create a new note and open it in the editor
    createNoteMutation.mutate({
      title: "Untitled Note",
      content: "",
    }, {
      onSuccess: (newNote) => {
        setSelectedNoteId(newNote.id);
        toast({
          title: "Note created",
          description: "New note has been created successfully."
        });
      },
      onError: (error) => {
        console.error("Error creating note:", error);
        toast({
          title: "Error",
          description: "Failed to create new note. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const renderMainContent = () => {
    switch (selectedSection) {
      case "notebooks":
        return <NotebooksView />;
      case "files":
        return <FilesView />;
      case "tags":
        return <TagsView />;
      case "shared":
        return <SharedView />;
      case "trash":
        return <TrashView />;
      default:
        return (
          <div className="flex flex-1 overflow-hidden">
            {/* Notes List Panel */}
            <div className="w-96 border-r border-gray-200 bg-white">
              <NotesListView
                selectedNoteId={selectedNoteId}
                onNoteSelect={handleNoteSelect}
                searchQuery={searchQuery}
              />
            </div>
            
            {/* Note Editor Panel */}
            <div className="flex-1">
              <NoteEditor
                noteId={selectedNoteId}
                onNoteCreated={handleNoteSelect}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <ModNoteSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ModNoteHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewNote={handleNewNote}
          isNoteEditing={selectedSection === "notes" && !!selectedNoteId}
        />
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}
