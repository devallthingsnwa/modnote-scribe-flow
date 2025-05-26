
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Bold, Italic, List, ListChecks, Save } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";
import { AIProcessingButton } from "@/components/AIProcessingButton";
import { AIChatModal } from "@/components/AIChatModal";
import { useIsMobile } from "@/hooks/use-mobile";

interface NoteEditorProps {
  initialNote?: {
    id?: string;
    title: string;
    content: string | null;
    tags: string[];
  };
  onSave?: (note: {
    title: string;
    content: string | null;
    tags: string[];
  }) => void;
}

export function NoteEditor({ initialNote, onSave }: NoteEditorProps) {
  const isMobile = useIsMobile();
  const [note, setNote] = useState({
    title: initialNote?.title || "",
    content: initialNote?.content || "",
    tags: initialNote?.tags || [],
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setNote({
        title: initialNote.title,
        content: initialNote.content || "",
        tags: initialNote.tags,
      });
    }
  }, [initialNote]);

  const handleSave = () => {
    if (onSave) {
      setIsSaving(true);
      try {
        onSave(note);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleTagChange = (selectedTags: string[]) => {
    setNote({ ...note, tags: selectedTags });
  };

  const handleContentUpdate = (newContent: string) => {
    setNote({ ...note, content: newContent });
    // Auto-save after AI processing
    if (onSave) {
      onSave({ ...note, content: newContent });
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-3">
          <Input
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            placeholder="Untitled Note"
            className="text-xl font-medium border-none focus-visible:ring-0 px-0 mb-4 bg-transparent"
          />

          <Textarea
            value={note.content || ""}
            onChange={(e) => setNote({ ...note, content: e.target.value })}
            placeholder="Start writing..."
            className="min-h-[300px] resize-none border-none focus-visible:ring-0 px-0 bg-transparent"
          />
        </div>

        <div className="p-3 border-t border-border">
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

          {initialNote?.id && (
            <div className="mb-3 flex gap-2">
              <AIProcessingButton
                noteId={initialNote.id}
                content={note.content}
                onContentUpdated={handleContentUpdate}
              />
              <AIChatModal
                noteId={initialNote.id}
                content={note.content || ""}
              />
            </div>
          )}

          <TagSelector
            selectedTags={note.tags}
            onChange={handleTagChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ListChecks className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {initialNote?.id && (
            <>
              <AIProcessingButton
                noteId={initialNote.id}
                content={note.content}
                onContentUpdated={handleContentUpdate}
              />
              <AIChatModal
                noteId={initialNote.id}
                content={note.content || ""}
              />
            </>
          )}
          
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Input
          value={note.title}
          onChange={(e) => setNote({ ...note, title: e.target.value })}
          placeholder="Untitled Note"
          className="text-xl font-medium border-none focus-visible:ring-0 px-0 mb-4"
        />

        <Textarea
          value={note.content || ""}
          onChange={(e) => setNote({ ...note, content: e.target.value })}
          placeholder="Start writing..."
          className="min-h-[500px] resize-none border-none focus-visible:ring-0 px-0"
        />
      </div>

      <Card className="border-t rounded-none">
        <CardContent className="p-4">
          <TagSelector
            selectedTags={note.tags}
            onChange={handleTagChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
