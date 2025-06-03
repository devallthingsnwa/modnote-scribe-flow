
import { useState } from "react";
import { EnhancedModNoteHeader } from "./EnhancedModNoteHeader";
import { EnhancedModNoteSidebar } from "./EnhancedModNoteSidebar";
import { EnhancedNotesListView } from "./EnhancedNotesListView";
import { EnhancedNoteEditor } from "./EnhancedNoteEditor";
import { useModNotes } from "@/lib/modNoteApi";

export function EnhancedModNoteLayout() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "reminders">("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("notes");
  
  const { data: notes, refetch } = useModNotes();

  const filteredNotes = notes?.filter(note => {
    if (activeTab === "reminders") {
      return note.is_reminder || note.due_date || note.reminder_date;
    }
    return !note.is_reminder;
  }).filter(note => {
    if (!searchQuery) return true;
    return note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           note.content?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  const handleTabChange = (tab: "notes" | "reminders") => {
    setActiveTab(tab);
    setSelectedNoteId(null); // Clear selection when switching tabs
  };

  const handleNewNote = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Enhanced Sidebar */}
      <EnhancedModNoteSidebar 
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <EnhancedModNoteHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewNote={handleNewNote}
          selectedNoteId={selectedNoteId}
        />
        
        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Notes List Panel */}
          <div className="w-96 border-r border-gray-200 bg-white">
            <EnhancedNotesListView
              notes={filteredNotes}
              selectedNoteId={selectedNoteId}
              onNoteSelect={handleNoteSelect}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              notesCount={filteredNotes.length}
            />
          </div>
          
          {/* Note Editor Panel */}
          <div className="flex-1">
            <EnhancedNoteEditor
              noteId={selectedNoteId}
              onNoteDeleted={() => {
                setSelectedNoteId(null);
                refetch();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
