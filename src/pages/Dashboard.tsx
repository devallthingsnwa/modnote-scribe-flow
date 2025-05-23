import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Search } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { NoteCard, NoteCardProps } from "@/components/NoteCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportModal } from "@/components/ImportModal";
import { useToast } from "@/hooks/use-toast";
import { useNotes, useCreateNote } from "@/lib/api";
import { extractYouTubeId } from "@/components/import/ImportUtils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  const { data: notes, isLoading, error } = useNotes();
  const createNoteMutation = useCreateNote();

  const handleNoteClick = (id: string) => {
    navigate(`/note/${id}`);
  };

  const handleNewNote = () => {
    navigate("/new");
  };

  const handleImport = (url: string, type: string) => {
    toast({
      title: "Content import complete",
      description: `Your ${type} content has been processed and is available in your notes.`,
    });
  };
  
  const filteredNotes = notes?.filter(note => {
    if (!searchQuery) return true;
    return (
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Transform notes from API to NoteCard format
  const transformNotesToCardProps = (): NoteCardProps[] => {
    if (!filteredNotes) return [];
    
    return filteredNotes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content || "",
      date: new Date(note.created_at),
      tags: note.tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color
      })),
      notebook: note.notebook_id ? {
        id: note.notebook_id,
        name: "Unknown"
      } : undefined,
      thumbnail: note.thumbnail || undefined
    }));
  };

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b p-4 ${isMobile ? 'bg-[#0f0f0f] border-gray-800' : 'border-border bg-background'}`}>
          <div className="flex justify-between items-center gap-2">
            <h1 className={`text-2xl font-semibold ${isMobile ? 'text-white' : ''}`}>Notes</h1>
            <div className="flex space-x-2">
              <Button 
                variant={isMobile ? "ghost" : "default"} 
                size={isMobile ? "icon" : "default"} 
                onClick={() => setImportModalOpen(true)}
                className={isMobile ? 'mobile-ghost-button' : ''}
              >
                {isMobile ? null : "Import"}
              </Button>
              {!isMobile && (
                <Button onClick={handleNewNote}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Note
                </Button>
              )}
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <Input
              placeholder="Search notes..."
              className={`pl-10 w-full ${isMobile ? 'mobile-search' : ''}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>
        
        <main className={`flex-1 overflow-y-auto p-4 pb-20 md:pb-4 ${isMobile ? 'bg-[#0f0f0f]' : ''}`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className={`animate-pulse ${isMobile ? 'text-gray-400' : ''}`}>Loading notes...</div>
            </div>
          ) : error ? (
            <div className={`text-center p-4 ${isMobile ? 'text-red-400' : 'text-red-500'}`}>
              Error loading notes. Please try again.
            </div>
          ) : filteredNotes && filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transformNotesToCardProps().map((note) => (
                <NoteCard
                  key={note.id}
                  {...note}
                  onClick={() => handleNoteClick(note.id)}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center p-8 flex flex-col items-center ${isMobile ? 'mobile-empty-state' : ''}`}>
              <div className={`rounded-full p-6 mb-4 ${isMobile ? 'mobile-empty-icon' : 'bg-muted/30'}`}>
                <PlusCircle className={`h-12 w-12 ${isMobile ? 'text-gray-400' : 'text-muted-foreground/60'}`} />
              </div>
              <p className={`mb-4 ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
                {searchQuery ? "No notes matching your search" : "No notes found. Create your first note!"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={handleNewNote}
                  className={isMobile ? 'mobile-primary-button' : ''}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Note
                </Button>
              )}
            </div>
          )}
        </main>
        
        {/* Mobile Bottom Navigation Space */}
        <div className="h-20 md:hidden" />
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
