
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SemanticSearchEngine } from '@/lib/vectorSearch/semanticSearchEngine';

interface Note {
  id: string;
  title: string;
  content: string | null;
  is_transcription?: boolean;
}

export function useNoteIndexing() {
  const { toast } = useToast();

  const indexNote = async (note: Note) => {
    if (!note.content) return;

    const sourceType = note.is_transcription ? 'video' : 'note';
    
    try {
      const success = await SemanticSearchEngine.indexNote(
        note.id,
        note.title,
        note.content,
        sourceType
      );

      if (success) {
        console.log(`✅ Note "${note.title}" indexed successfully for semantic search`);
      } else {
        console.warn(`⚠️ Failed to index note "${note.title}" for semantic search`);
      }
    } catch (error) {
      console.error('Error indexing note:', error);
    }
  };

  const removeNoteIndex = async (noteId: string) => {
    try {
      const success = await SemanticSearchEngine.removeNoteIndex(noteId);
      
      if (success) {
        console.log(`✅ Note index removed successfully`);
      } else {
        console.warn(`⚠️ Failed to remove note index`);
      }
    } catch (error) {
      console.error('Error removing note index:', error);
    }
  };

  return {
    indexNote,
    removeNoteIndex
  };
}
