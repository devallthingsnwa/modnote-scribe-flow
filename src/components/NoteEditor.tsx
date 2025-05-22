
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Bold, Italic, List, ListChecks, Save } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";

interface NoteEditorProps {
  initialNote?: {
    id?: number;
    title: string;
    content: string;
    tags: number[];
  };
  onSave?: (note: {
    title: string;
    content: string;
    tags: number[];
  }) => void;
}

export function NoteEditor({ initialNote, onSave }: NoteEditorProps) {
  const [note, setNote] = useState({
    title: initialNote?.title || "",
    content: initialNote?.content || "",
    tags: initialNote?.tags || [],
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (onSave) {
      setIsSaving(true);
      // Simulate API call
      setTimeout(() => {
        onSave(note);
        setIsSaving(false);
      }, 500);
    }
  };

  const handleTagChange = (selectedTags: number[]) => {
    setNote({ ...note, tags: selectedTags });
  };

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

        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? "Saving..." : "Save"}</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Input
          value={note.title}
          onChange={(e) => setNote({ ...note, title: e.target.value })}
          placeholder="Untitled Note"
          className="text-xl font-medium border-none focus-visible:ring-0 px-0 mb-4"
        />

        <Textarea
          value={note.content}
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
