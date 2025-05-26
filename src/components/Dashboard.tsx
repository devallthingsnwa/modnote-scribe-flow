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
import { AISearchNavbar } from "@/components/AISearchNavbar";

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

  const handleImport = (url: string, type: string) => {
    toast({
      title: "Multimedia import complete",
      description: `Your ${type} content has been transcribed and is available in your notes.`,
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
      <div className="flex h-screen bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="bg-destructive/10 rounded-full p-6 w-fit mx-auto mb-4">
              <PlusCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't load your notes. Please check your connection and try again.
            </p>
            <button 
              onClick={() => refetch()} 
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
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
              <div className="flex-1 flex flex-col bg-background">
                {/* Enhanced Mobile Header */}
                <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                          Notes
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notes?.length || 0} notes
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AISearchNavbar />
                        <button 
                          onClick={() => setImportModalOpen(true)}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                          Import
                        </button>
                      </div>
                    </div>
                  </div>
                </header>
                
                <div className="flex-1 bg-background">
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
          /* Enhanced Desktop Layout */
          <>
            {/* Left Panel: Notes List */}
            <div className={`${isNotesPanelCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 transition-all duration-300 border-r border-border bg-background/50`}>
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
            <div className="flex-1 flex flex-col bg-background">
              {/* Enhanced Desktop Header */}
              <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div>
                        <h1 className="text-lg font-semibold text-foreground">
                          {selectedNoteId ? 'Note Editor' : 'Your Notes'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                          {selectedNoteId 
                            ? 'Edit and organize your content' 
                            : `${notes?.length || 0} notes available`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AISearchNavbar />
                    </div>
                  </div>
                </div>
              </div>
              
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
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
      />
    </div>
  );
}
