import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { NotesListPanel } from "@/components/NotesListPanel";
import { NoteContentPanel } from "@/components/NoteContentPanel";
import { EnhancedImportModal } from "@/components/import/EnhancedImportModal";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNoteIndexing } from "@/hooks/useNoteIndexing";

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
  const { indexNote } = useNoteIndexing();

  console.log('Dashboard component rendered', { notes: notes?.length, error, isLoading });

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

  const handleImport = async (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    console.log('📥 Content imported successfully:', note.title);
    
    toast({
      title: "Content imported successfully",
      description: `Your content "${note.title}" has been imported and is available in your notes.`,
    });
    
    // Force refresh the notes list to show the new import immediately
    console.log('🔄 Refreshing notes list after import...');
    await refetch();
    
    // Close the import modal
    setImportModalOpen(false);
    
    // Index the imported note for semantic search in the background
    if (note.content) {
      try {
        // Wait a moment for the database to update, then find and index the note
        setTimeout(async () => {
          try {
            const updatedNotes = await refetch();
            const importedNote = updatedNotes.data?.find(n => n.title === note.title);
            
            if (importedNote) {
              await indexNote(importedNote);
              console.log('✅ Imported note indexed for semantic search');
            }
          } catch (error) {
            console.warn('⚠️ Failed to index imported note:', error);
          }
        }, 1000);
      } catch (error) {
        console.warn('⚠️ Failed to schedule note indexing:', error);
      }
    }
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
    console.error('Dashboard error:', error);
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
      
      <EnhancedImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
