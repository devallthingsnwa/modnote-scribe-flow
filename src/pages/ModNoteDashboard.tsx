
import { useState } from "react";
import { ModNoteHeader } from "@/components/modnote/ModNoteHeader";
import { ModNoteSidebar } from "@/components/modnote/ModNoteSidebar";
import { NotesListView } from "@/components/modnote/NotesListView";
import { NoteEditor } from "@/components/modnote/NoteEditor";
import { NotebooksView } from "@/components/modnote/NotebooksView";
import { FilesView } from "@/components/modnote/FilesView";
import { TagsView } from "@/components/modnote/TagsView";
import { SharedView } from "@/components/modnote/SharedView";
import { TrashView } from "@/components/modnote/TrashView";

export default function ModNoteDashboard() {
  const [selectedSection, setSelectedSection] = useState("notes");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  const handleNewNote = () => {
    // Create new note and open in editor
    const newNoteId = `note-${Date.now()}`;
    setSelectedNoteId(newNoteId);
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
      <ModNoteSidebar 
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />
      
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
