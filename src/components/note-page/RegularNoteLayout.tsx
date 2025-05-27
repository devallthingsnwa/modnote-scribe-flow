
import { NoteEditor } from "@/components/NoteEditor";

interface RegularNoteLayoutProps {
  note: any;
  onSave: (updatedNote: any) => void;
}

export function RegularNoteLayout({ note, onSave }: RegularNoteLayoutProps) {
  return (
    <div className="p-6 h-full">
      <NoteEditor 
        initialNote={{
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags.map(tag => tag.id),
        }} 
        onSave={onSave}
      />
    </div>
  );
}
