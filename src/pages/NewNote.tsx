
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
    tags: [] as string[]
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
        variant: "destructive"
      });
    }
  }, [user, authLoading, navigate]);

  const handleSave = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create notes.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    createNoteMutation.mutate({
      note: {
        title: note.title || "Untitled Note",
        content: note.content
      },
      tagIds: note.tags
    }, {
      onSuccess: () => {
        toast({
          title: "Note created",
          description: "Your new note has been created successfully."
        });
        navigate("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Error creating note",
          description: "There was an error creating your note. Please try again.",
          variant: "destructive"
        });
        console.error("Create note error:", error);
      },
      onSettled: () => {
        setIsSaving(false);
      }
    });
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleImport = (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    createNoteMutation.mutate({
      note: {
        title: note.title,
        content: note.content,
        source_url: note.source_url,
        thumbnail: note.thumbnail,
        is_transcription: note.is_transcription
      },
      tagIds: []
    }, {
      onSuccess: () => {
        toast({
          title: "Content imported and saved",
          description: `Your content "${note.title}" has been imported and saved successfully.`
        });
        navigate("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Import failed",
          description: "There was an error saving your imported content. Please try again.",
          variant: "destructive"
        });
        console.error("Import error:", error);
      }
    });
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
        <header className="border-b border-border p-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">New Note</h1>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </header>
        
        <div className="flex-1 overflow-y-auto mobile-editor p-0">
          <Input 
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            placeholder="Note title..."
            className="mobile-editor-input border-0 bg-transparent text-lg font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <Textarea 
            value={note.content}
            onChange={(e) => setNote({ ...note, content: e.target.value })}
            placeholder="Start writing your note... (Paste YouTube URLs to auto-detect transcript extraction)"
            className="mobile-editor-textarea border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        
        <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex space-x-2 mb-4">
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
          isOpen={importModalOpen} 
          onClose={() => setImportModalOpen(false)} 
          onImport={handleImport} 
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-3">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">New Note</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setImportModalOpen(true)} 
                variant="outline"
                className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                Import from URL
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 px-6"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Note
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <NoteEditor 
              initialNote={{
                id: undefined,
                title: "",
                content: "",
                tags: []
              }} 
              onSave={handleSave} 
            />
          </div>
        </main>
      </div>
      
      <ImportModal 
        isOpen={importModalOpen} 
        onClose={() => setImportModalOpen(false)} 
        onImport={handleImport} 
      />
    </div>
  );
}
