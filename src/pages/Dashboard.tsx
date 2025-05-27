import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { NotesListPanel } from "@/components/NotesListPanel";
import { NoteContentPanel } from "@/components/NoteContentPanel";
import { ImportModal } from "@/components/ImportModal";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showNoteContent, setShowNoteContent] = useState(false);
  const [isNotesPanelCollapsed, setIsNotesPanelCollapsed] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  
  const { data: notes, isLoading, error, refetch } = useNotes();

  const handleNoteSelect = (noteId: string) => {
    if (isSelectMode) {
      setSelectedNoteIds(prev => 
        prev.includes(noteId) 
          ? prev.filter(id => id !== noteId)
          : [...prev, noteId]
      );
    } else {
      setSelectedNoteId(noteId);
      if (isMobile) {
        setShowNoteContent(true);
      }
    }
  };

  const handleNewNote = () => {
    navigate("/new");
  };

  const handleImport = (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    toast({
      title: "Content imported successfully",
      description: `Your content "${note.title}" has been imported and is available in your notes.`,
    });
    refetch();
  };

  const handleNoteDeleted = () => {
    setSelectedNoteId(null);
    setShowNoteContent(false);
    refetch();
  };

  const handleBackToList = () => {
    setShowNoteContent(false);
    setSelectedNoteId(null);
  };

  const toggleNotesPanel = () => {
    setIsNotesPanelCollapsed(!isNotesPanelCollapsed);
  };

  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedNoteIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedNoteIds.length > 0) {
      // This will be handled by the NotesListPanel component
      setSelectedNoteIds([]);
      setIsSelectMode(false);
      refetch();
    }
  };
  
  const filteredNotes = notes?.filter(note => {
    if (!searchQuery) return true;
    return (
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  if (error) {
    return (
      <div className="flex h-screen">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-500 mb-4">Error loading notes. Please try again.</p>
            <button onClick={() => refetch()} className="text-primary hover:underline">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile: Show either list or content */}
        {isMobile ? (
          <>
            {!showNoteContent ? (
              <div className="flex-1 flex flex-col">
                {/* Mobile Header */}
                <header className="border-b p-4 bg-[#0f0f0f] border-gray-800">
                  <div className="flex justify-between items-center gap-2">
                    <h1 className="text-2xl font-semibold text-white">Notes</h1>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setImportModalOpen(true)}
                        className="mobile-ghost-button"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                </header>
                
                <div className="flex-1 bg-[#0f0f0f]">
                  <NotesListPanel
                    notes={filteredNotes}
                    selectedNoteId={selectedNoteId}
                    onNoteSelect={handleNoteSelect}
                    onNewNote={handleNewNote}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    isLoading={isLoading}
                    onImport={() => setImportModalOpen(true)}
                    isSelectMode={isSelectMode}
                    selectedNoteIds={selectedNoteIds}
                    onSelectModeToggle={handleSelectModeToggle}
                    onBulkDelete={handleBulkDelete}
                  />
                </div>
                
                <div className="h-20" />
              </div>
            ) : (
              <NoteContentPanel
                noteId={selectedNoteId}
                onBack={handleBackToList}
                onNoteDeleted={handleNoteDeleted}
              />
            )}
          </>
        ) : (
          /* Desktop: Evernote-style two-panel layout */
          <>
            {/* Left Panel: Notes List */}
            <div className={`${isNotesPanelCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 transition-all duration-300 border-r border-border`}>
              <NotesListPanel
                notes={filteredNotes}
                selectedNoteId={selectedNoteId}
                onNoteSelect={handleNoteSelect}
                onNewNote={handleNewNote}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isLoading={isLoading}
                onImport={() => setImportModalOpen(true)}
                isCollapsed={isNotesPanelCollapsed}
                onToggleCollapse={toggleNotesPanel}
                isSelectMode={isSelectMode}
                selectedNoteIds={selectedNoteIds}
                onSelectModeToggle={handleSelectModeToggle}
                onBulkDelete={handleBulkDelete}
              />
            </div>
            
            {/* Right Panel: Note Content */}
            <div className="flex-1 flex flex-col">
              <NoteContentPanel
                noteId={selectedNoteId}
                onBack={handleBackToList}
                onNoteDeleted={handleNoteDeleted}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Mobile Navigation */}
      {isMobile && <MobileNavigation />}
      
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
