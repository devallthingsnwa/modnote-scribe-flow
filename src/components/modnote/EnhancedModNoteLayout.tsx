
import { useState } from "react";
import { EnhancedModNoteHeader } from "./EnhancedModNoteHeader";
import { EnhancedModNoteSidebar } from "./EnhancedModNoteSidebar";
import { EnhancedNotesListView } from "./EnhancedNotesListView";
import { EnhancedNoteEditor } from "./EnhancedNoteEditor";
import { NotebooksListView } from "./NotebooksListView";
import { useModNotes, useCreateModNote } from "@/lib/modNoteApi";
import { useToast } from "@/hooks/use-toast";

export function EnhancedModNoteLayout() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "reminders">("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("notes");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data: notes, refetch } = useModNotes();
  const createNoteMutation = useCreateModNote();
  const { toast } = useToast();

  const filteredNotes = notes?.filter(note => {
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
    createNoteMutation.mutate({
      title: "Untitled Note",
      content: "",
      is_reminder: activeTab === "reminders",
    }, {
      onSuccess: (newNote) => {
        setSelectedNoteId(newNote.id);
        toast({
          title: "Note created",
          description: "New note has been created successfully."
        });
        refetch();
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

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    if (section === "notebooks") {
      setSelectedNoteId(null);
    }
  };

  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedNoteIds([]);
    }
  };

  const handleBulkDelete = () => {
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
