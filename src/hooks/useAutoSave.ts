
import { useEffect, useRef, useCallback } from 'react';
import { useUpdateNote } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AutoSaveOptions {
  noteId: string;
  content: string | null;
  title: string;
  tagIds?: string[];
  delay?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoSave({
  noteId,
  content,
  title,
  tagIds,
  delay = 3000, // 3 seconds default
  enabled = true
}: AutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<{ content: string | null; title: string; tagIds?: string[] }>({
    content: null,
    title: '',
    tagIds: []
  });
  
  const updateNoteMutation = useUpdateNote();
  const { toast } = useToast();

  const saveNote = useCallback(async () => {
    if (!enabled || !noteId) return;

    const currentData = { content, title, tagIds };
    const lastSaved = lastSavedRef.current;

    // Check if data has actually changed
    const hasContentChanged = currentData.content !== lastSaved.content;
    const hasTitleChanged = currentData.title !== lastSaved.title;
    const haveTagsChanged = JSON.stringify(currentData.tagIds) !== JSON.stringify(lastSaved.tagIds);

    if (!hasContentChanged && !hasTitleChanged && !haveTagsChanged) {
      return;
    }

    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        updates: {
          title,
          content,
          updated_at: new Date().toISOString(),
        },
        tagIds,
      });

      // Update last saved reference
      lastSavedRef.current = { ...currentData };
      
      console.log('Auto-saved note successfully');
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast({
        title: "Auto-save failed",
        description: "Your changes couldn't be saved automatically. Please save manually.",
        variant: "destructive",
      });
    }
  }, [noteId, content, title, tagIds, enabled, updateNoteMutation, toast]);

  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(saveNote, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, title, tagIds, delay, enabled, saveNote]);

  // Manual save function
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    saveNote();
  }, [saveNote]);

  return {
    saveNow,
    isSaving: updateNoteMutation.isPending,
  };
}
