
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { NotesListPanel } from "@/components/NotesListPanel";
import { NoteContentPanel } from "@/components/NoteContentPanel";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardSelectionHandler } from "@/components/dashboard/DashboardSelectionHandler";
import { DashboardImportHandler } from "@/components/dashboard/DashboardImportHandler";
import { useNotes } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Dashboard() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: notes, refetch } = useNotes();

  const filteredNotes = notes?.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  const handleNoteDeleted = () => {
    setSelectedNoteId(null);
    refetch();
  };

  return (
    <DashboardLayout>
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        {/* ModNote Interface Link */}
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Try the Enhanced ModNote Interface</h3>
              <p className="text-sm text-blue-700">Experience the full ModNote UI with Upload, AI features, and collaboration tools.</p>
            </div>
            <Link to="/modnote">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Open ModNote
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <NotesListPanel
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            onNoteSelect={handleNoteSelect}
          />
          
          <NoteContentPanel
            noteId={selectedNoteId}
            onBack={() => setSelectedNoteId(null)}
            onNoteDeleted={handleNoteDeleted}
          />
        </div>
      </div>

      <DashboardSelectionHandler 
        notes={filteredNotes}
        onNoteSelect={handleNoteSelect}
      />
      
      <DashboardImportHandler onImportComplete={refetch} />
    </DashboardLayout>
  );
}
