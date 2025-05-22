
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { NoteCard, NoteCardProps } from "@/components/NoteCard";
import { Button } from "@/components/ui/button";
import { ImportModal } from "@/components/ImportModal";
import { useToast } from "@/hooks/use-toast";

// Sample data for notes
const sampleNotes: NoteCardProps[] = [
  {
    id: 1,
    title: "Meeting Notes: Product Launch",
    content: "Discussed the timeline for the Q3 product launch. Key points: marketing strategy, budget allocation, and team responsibilities.",
    date: new Date("2023-05-15T14:30:00"),
    tags: [
      { id: 1, name: "Important", color: "bg-red-500" },
      { id: 7, name: "Work", color: "bg-gray-500" },
    ],
    notebook: { id: 2, name: "Work" },
  },
  {
    id: 2,
    title: "Project Ideas",
    content: "Brainstorming session for new app features: 1. Dark mode toggle, 2. Export to PDF, 3. Voice notes integration, 4. Tag management system",
    date: new Date("2023-05-10T09:15:00"),
    tags: [
      { id: 2, name: "Idea", color: "bg-modnote-blue" },
      { id: 5, name: "Project", color: "bg-modnote-purple" },
    ],
    notebook: { id: 3, name: "Study" },
  },
  {
    id: 3,
    title: "Learning React Hooks",
    content: "useEffect, useState, useContext, useReducer, useMemo, useCallback, useRef, useImperativeHandle, useLayoutEffect, useDebugValue",
    date: new Date("2023-05-05T16:45:00"),
    tags: [
      { id: 4, name: "Resource", color: "bg-modnote-yellow" },
    ],
    notebook: { id: 3, name: "Study" },
  },
  {
    id: 4,
    title: "Grocery List",
    content: "Milk, Eggs, Bread, Cheese, Apples, Bananas, Chicken, Rice, Pasta, Tomatoes, Onions, Garlic, Cereal",
    date: new Date("2023-05-02T08:00:00"),
    tags: [
      { id: 3, name: "Todo", color: "bg-modnote-green" },
      { id: 6, name: "Personal", color: "bg-modnote-pink" },
    ],
    notebook: { id: 1, name: "Personal" },
  },
  {
    id: 5,
    title: "YouTube: Advanced JavaScript Patterns",
    content: "Learned about factory functions, module pattern, singleton pattern, observer pattern, and mediator pattern.",
    date: new Date("2023-04-28T10:30:00"),
    tags: [
      { id: 4, name: "Resource", color: "bg-modnote-yellow" },
    ],
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    notebook: { id: 3, name: "Study" },
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteCardProps[]>(sampleNotes);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleNoteClick = (id: number) => {
    navigate(`/note/${id}`);
  };

  const handleNewNote = () => {
    navigate("/new");
  };

  const handleImport = (url: string, type: string) => {
    toast({
      title: "Content import started",
      description: `Your ${type} content is being processed and will be available soon.`,
    });
    
    // Simulate import processing
    setTimeout(() => {
      toast({
        title: "Content imported successfully",
        description: "Your content has been transcribed and is ready for editing.",
      });
      
      // Add a new note with the imported content
      const newNote: NoteCardProps = {
        id: notes.length + 1,
        title: `Imported ${type}: ${url.substring(0, 30)}...`,
        content: "This is the transcribed content from your imported media.",
        date: new Date(),
        tags: [
          { id: 4, name: "Resource", color: "bg-modnote-yellow" },
        ],
        thumbnail: type === "video" ? "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" : undefined,
        notebook: { id: 1, name: "Personal" },
      };
      
      setNotes([newNote, ...notes]);
    }, 3000);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">All Notes</h1>
            <div className="flex space-x-2">
              <Button onClick={() => setImportModalOpen(true)}>
                Import Content
              </Button>
              <Button onClick={handleNewNote}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                {...note}
                onClick={() => handleNoteClick(note.id)}
              />
            ))}
          </div>
        </main>
      </div>
      
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
      />
    </div>
  );
}
