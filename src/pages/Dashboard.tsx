
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
  const [showNoteContent, setShowNoteContent] = useState(false); // For mobile view
  
  const { data: notes, isLoading, error, refetch } = useNotes();

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (isMobile) {
      setShowNoteContent(true);
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
    refetch(); // Refresh notes list
  };

  const handleNoteDeleted = () => {
    setSelectedNoteId(null);
    setShowNoteContent(false);
    refetch(); // Refresh notes list
  };

  const handleBackToList = () => {
    setShowNoteContent(false);
    setSelectedNoteId(null);
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
                  />
                </div>
                
                <div className="h-20" /> {/* Space for mobile nav */}
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
          /* Desktop: Two-panel layout */
          <>
            {/* Notes List Panel */}
            <div className="w-80 flex-shrink-0">
              <NotesListPanel
                notes={filteredNotes}
                selectedNoteId={selectedNoteId}
                onNoteSelect={handleNoteSelect}
                onNewNote={handleNewNote}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isLoading={isLoading}
              />
            </div>
            
            {/* Note Content Panel */}
            <NoteContentPanel
              noteId={selectedNoteId}
              onBack={handleBackToList}
              onNoteDeleted={handleNoteDeleted}
            />
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
