
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotesListPanel } from "@/components/NotesListPanel";
import { NoteContentPanel } from "@/components/NoteContentPanel";
import { EnhancedImportModal } from "@/components/import/EnhancedImportModal";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useDashboardImportHandler } from "@/components/dashboard/DashboardImportHandler";
import { useDashboardSelection } from "@/components/dashboard/DashboardSelectionHandler";
import { useNotes } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showNoteContent, setShowNoteContent] = useState(false);
  const [isNotesPanelCollapsed, setIsNotesPanelCollapsed] = useState(false);
  
  const { data: notes, isLoading, error, refetch } = useNotes();
  const { handleImport } = useDashboardImportHandler({ refetch });
  const {
    isSelectMode,
    selectedNoteIds,
    handleSelectModeToggle,
    handleBulkDelete,
    handleNoteSelect
  } = useDashboardSelection();

  console.log('Dashboard component rendered', { 
    notesCount: notes?.length, 
    error, 
    isLoading,
    latestNote: notes?.[0]?.title 
  });

  const onNoteSelect = (noteId: string) => {
    handleNoteSelect(noteId, setSelectedNoteId, setShowNoteContent, isMobile);
  };

  const handleNewNote = () => {
    navigate("/new");
  };

  const onImport = async (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    console.log('📥 Starting import process for:', note.title);
    setImportModalOpen(false);
    await handleImport(note);
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

  const onBulkDelete = () => {
    handleBulkDelete();
    refetch();
  };
  
  const filteredNotes = notes?.filter(note => {
    if (!searchQuery) return true;
    return (
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  if (error) {
    console.error('Dashboard error:', error);
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-500 mb-4">Error loading notes. Please try again.</p>
            <button onClick={() => refetch()} className="text-primary hover:underline">
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Mobile: Show either list or content */}
      {isMobile ? (
        <>
          {!showNoteContent ? (
            <div className="flex-1 flex flex-col">
              <DashboardHeader onImportClick={() => setImportModalOpen(true)} />
              
              <div className="flex-1 bg-[#0f0f0f]">
                <NotesListPanel
                  notes={filteredNotes}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={onNoteSelect}
                  onNewNote={handleNewNote}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isLoading={isLoading}
                  onImport={() => setImportModalOpen(true)}
                  isSelectMode={isSelectMode}
                  selectedNoteIds={selectedNoteIds}
                  onSelectModeToggle={handleSelectModeToggle}
                  onBulkDelete={onBulkDelete}
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
              onNoteSelect={onNoteSelect}
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
              onBulkDelete={onBulkDelete}
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
      
      <EnhancedImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={onImport}
      />
    </DashboardLayout>
  );
}
