
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";

// Sample notes data - in a real app, this would come from an API
const sampleNotes = [
  {
    id: 1,
    title: "Meeting Notes: Product Launch",
    content: "Discussed the timeline for the Q3 product launch. Key points: marketing strategy, budget allocation, and team responsibilities.",
    tags: [1, 7],
  },
  {
    id: 2,
    title: "Project Ideas",
    content: "Brainstorming session for new app features: 1. Dark mode toggle, 2. Export to PDF, 3. Voice notes integration, 4. Tag management system",
    tags: [2, 5],
  },
  {
    id: 3,
    title: "Learning React Hooks",
    content: "useEffect, useState, useContext, useReducer, useMemo, useCallback, useRef, useImperativeHandle, useLayoutEffect, useDebugValue",
    tags: [4],
  },
  {
    id: 4,
    title: "Grocery List",
    content: "Milk, Eggs, Bread, Cheese, Apples, Bananas, Chicken, Rice, Pasta, Tomatoes, Onions, Garlic, Cereal",
    tags: [3, 6],
  },
  {
    id: 5,
    title: "YouTube: Advanced JavaScript Patterns",
    content: "Learned about factory functions, module pattern, singleton pattern, observer pattern, and mediator pattern.",
    tags: [4],
  },
];

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [note, setNote] = useState<{
    id?: number;
    title: string;
    content: string;
    tags: number[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const foundNote = sampleNotes.find(
        (n) => n.id === parseInt(id || "0", 10)
      );
      
      if (foundNote) {
        setNote(foundNote);
      } else {
        toast({
          title: "Note not found",
          description: "The requested note could not be found.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
      
      setIsLoading(false);
    }, 500);
  }, [id, navigate, toast]);

  const handleSave = (updatedNote: {
    title: string;
    content: string;
    tags: number[];
  }) => {
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Note saved",
        description: "Your note has been saved successfully.",
      });
      
      // In a real app, we would update the note in the database
      console.log("Saved note:", updatedNote);
    }, 500);
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold ml-2">
              {isLoading ? "Loading..." : note?.title || "Untitled Note"}
            </h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse-soft">Loading note...</div>
            </div>
          ) : note ? (
            <NoteEditor initialNote={note} onSave={handleSave} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div>Note not found</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
