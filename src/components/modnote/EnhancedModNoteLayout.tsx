
import { useState } from "react";
import { EnhancedModNoteHeader } from "./EnhancedModNoteHeader";
import { EnhancedModNoteSidebar } from "./EnhancedModNoteSidebar";
import { EnhancedNotesListView } from "./EnhancedNotesListView";
import { EnhancedNoteEditor } from "./EnhancedNoteEditor";

export function EnhancedModNoteLayout() {
  const [selectedSection, setSelectedSection] = useState("notes");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>("task-3");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"notes" | "reminders">("notes");

  const handleNoteSelect = (noteId: string) => {
    if (isSelectMode) {
      setSelectedNoteIds(prev => 
        prev.includes(noteId) 
          ? prev.filter(id => id !== noteId)
          : [...prev, noteId]
      );
    } else {
      setSelectedNoteId(noteId);
    }
  };

  const handleNewNote = () => {
    const newNoteId = `note-${Date.now()}`;
    setSelectedNoteId(newNoteId);
  };

  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedNoteIds([]);
  };

  const handleBulkDelete = () => {
    // Handle bulk delete logic here
    setSelectedNoteIds([]);
    setIsSelectMode(false);
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    if (section === "notes") {
      setSelectedNoteId("task-3");
    } else {
      setSelectedNoteId(null);
    }
  };

  const mockNotes = []; // Empty array since we're using the task-based data

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      {/* Sidebar */}
      <EnhancedModNoteSidebar 
        selectedSection={selectedSection}
        onSectionChange={handleSectionChange}
        isCollapsed={isCollapsed}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <EnhancedModNoteHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSelectMode={isSelectMode}
          selectedNoteIds={selectedNoteIds}
          onSelectModeToggle={handleSelectModeToggle}
          onBulkDelete={handleBulkDelete}
          onNewNote={handleNewNote}
          onImport={() => {}}
          onTranscriptUpload={() => {}}
          onFileUpload={() => {}}
          activeView={activeView}
          onViewChange={setActiveView}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {selectedSection === "notes" ? (
            <div className="flex flex-1 overflow-hidden">
              {/* Notes List Panel */}
              <div className="w-96 border-r border-gray-200 bg-white">
                <EnhancedNotesListView
                  notes={mockNotes}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={handleNoteSelect}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  notesCount={32}
                />
              </div>
              
              {/* Note Editor Panel */}
              <div className="flex-1">
                <EnhancedNoteEditor
                  noteId={selectedNoteId}
                  onNoteCreated={handleNoteSelect}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">Select {selectedSection}</div>
                <p className="text-sm">Choose an item from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
