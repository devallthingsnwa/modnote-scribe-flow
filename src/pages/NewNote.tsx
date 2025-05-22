
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";

export default function NewNote() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSave = (note: {
    title: string;
    content: string;
    tags: number[];
  }) => {
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Note created",
        description: "Your new note has been created successfully.",
      });
      
      // In a real app, we would add the note to the database
      console.log("Created note:", note);
      
      // Navigate to dashboard after creating note
      navigate("/dashboard");
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
            <h1 className="text-xl font-semibold ml-2">New Note</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          <NoteEditor
            initialNote={{
              title: "",
              content: "",
              tags: [],
            }}
            onSave={handleSave}
          />
        </main>
      </div>
    </div>
  );
}
