import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bold, Italic, List, ListChecks, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { useToast } from "@/hooks/use-toast";
import { ImportModal } from "@/components/ImportModal";
import { useCreateNote } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TagSelector } from "@/components/TagSelector";

export default function NewNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  const [note, setNote] = useState({
    title: "",
    content: "",
    tags: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const createNoteMutation = useCreateNote();

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
      toast({
        title: "Authentication Required",
        description: "Please sign in to create notes.",
        variant: "destructive",
      });
    }
  }, [user, authLoading, navigate]);

  const handleSave = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create notes.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    createNoteMutation.mutate(
      {
        note: {
          title: note.title || "Untitled Note",
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
        onSettled: () => {
          setIsSaving(false);
        }
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
        tagIds: [],
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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // If user is not authenticated, don't render the page content
  if (!user) {
    return null;
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background dark:bg-sidebar">
        <header className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">New Note</h1>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            variant="ghost"
            size="icon"
          >
            <Save className="h-5 w-5" />
          </Button>
        </header>
        
        <div className="flex-1 overflow-y-auto mobile-editor p-0">
          <Input
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            placeholder="Untitled Note"
            className="mobile-editor-input"
          />

          <Textarea
            value={note.content}
            onChange={(e) => setNote({ ...note, content: e.target.value })}
            placeholder="Start writing..."
            className="mobile-editor-textarea"
          />
        </div>
        
        <div className="border-t border-border p-3">
          <div className="flex space-x-2 mb-3">
            <Button variant="outline" size="icon" className="rounded-full w-9 h-9">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-9 h-9">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-9 h-9">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-9 h-9">
              <ListChecks className="h-4 w-4" />
            </Button>
          </div>
          
          <TagSelector
            selectedTags={note.tags}
            onChange={(tags) => setNote({ ...note, tags })}
          />
        </div>

        <div className="h-20">
          {/* Space for mobile navigation */}
        </div>
        
        <MobileNavigation />
        
        <ImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onImport={handleImport}
        />
      </div>
    );
  }

  // Desktop view (unchanged)
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
