
import { useState } from "react";
import { EnhancedModNoteHeader } from "./EnhancedModNoteHeader";
import { EnhancedModNoteSidebar } from "./EnhancedModNoteSidebar";
import { EnhancedNotesListView } from "./EnhancedNotesListView";
import { EnhancedNoteEditor } from "./EnhancedNoteEditor";
import { NotebooksListView } from "./NotebooksListView";
import { useModNotes } from "@/lib/modNoteApi";

export function EnhancedModNoteLayout() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>("task-3");
  const [activeTab, setActiveTab] = useState<"notes" | "reminders">("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("notes");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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
    if (tab === "notes") {
      setSelectedNoteId("task-3"); // Default to first task note
    } else {
      setSelectedNoteId(null);
    }
  };

  const handleNewNote = () => {
    refetch();
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    if (section === "notebooks") {
      setSelectedNoteId(null);
    } else {
      setSelectedNoteId("task-3");
    }
  };

  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedNoteIds([]);
    }
  };

  const handleBulkDelete = () => {
    // Handle bulk delete functionality
    console.log("Bulk delete notes:", selectedNoteIds);
    setSelectedNoteIds([]);
    setIsSelectMode(false);
    refetch();
  };

  const handleImport = () => {
    console.log("Handle import");
  };

  const handleTranscriptUpload = () => {
    refetch();
  };

  const handleFileUpload = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Enhanced Sidebar */}
      <EnhancedModNoteSidebar 
        selectedSection={selectedSection}
        onSectionChange={handleSectionChange}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <EnhancedModNoteHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSelectMode={isSelectMode}
          selectedNoteIds={selectedNoteIds}
          onSelectModeToggle={handleSelectModeToggle}
          onBulkDelete={handleBulkDelete}
          onNewNote={handleNewNote}
          onImport={handleImport}
          onTranscriptUpload={handleTranscriptUpload}
          onFileUpload={handleFileUpload}
          activeView={activeView}
          onViewChange={setActiveView}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
        
        {/* Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {selectedSection === "notebooks" ? (
            /* Notebooks View */
            <NotebooksListView />
          ) : (
            <>
              {/* Notes List Panel */}
              <div className="w-96 border-r border-gray-200 bg-white">
                <EnhancedNotesListView
                  notes={filteredNotes}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={handleNoteSelect}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  notesCount={32}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
