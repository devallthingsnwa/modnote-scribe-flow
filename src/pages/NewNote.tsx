
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";
import { ImportModal } from "@/components/ImportModal";
import { useCreateNote } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function NewNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  const createNoteMutation = useCreateNote();

  const handleSave = (note: {
    title: string;
    content: string | null;
    tags: string[];
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create notes.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate(
      {
        note: {
          title: note.title,
          content: note.content,
        },
        tagIds: note.tags,
      },
      {
        onSuccess: () => {
          toast({
            title: "Note created",
            description: "Your new note has been created successfully.",
          });
          navigate("/dashboard");
        },
        onError: (error) => {
          toast({
            title: "Error creating note",
            description: "There was an error creating your note. Please try again.",
            variant: "destructive",
          });
          console.error("Create note error:", error);
        },
      }
    );
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleImport = (url: string, type: string) => {
    toast({
      title: "Content import complete",
      description: "Your content has been transcribed, summarized, and added to your notes.",
    });
    
    createNoteMutation.mutate(
      {
        note: {
          title: `Imported ${type} from ${url.substring(0, 30)}...`,
          content: "This is the transcribed and summarized content from your imported media.",
          source_url: url,
          is_transcription: true,
        },
        tagIds: [], // Default tag if needed
      },
      {
        onSuccess: () => {
          toast({
            title: "Content imported successfully",
            description: "Your imported content has been saved.",
          });
          navigate("/dashboard");
        },
      }
    );
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold ml-2">New Note</h1>
            </div>
            <Button onClick={() => setImportModalOpen(true)} variant="outline">
              Import from URL
            </Button>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          <NoteEditor
            initialNote={{
              id: undefined,
              title: "",
              content: "",
              tags: [],
            }}
            onSave={handleSave}
          />
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
