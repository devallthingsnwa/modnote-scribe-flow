
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types for our data
export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Notebook {
  id: string;
  name: string;
  description: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  notebook_id: string | null;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  source_url: string | null;
  is_transcription: boolean | null;
}

export interface NoteWithTags extends Note {
  tags: Tag[];
}

// Notebooks API
export const fetchNotebooks = async (): Promise<Notebook[]> => {
  const { data, error } = await supabase
    .from("notebooks")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("Error fetching notebooks:", error);
    throw error;
  }
  
  return data || [];
};

export const createNotebook = async (notebook: { name: string; description?: string }): Promise<Notebook> => {
  const { data, error } = await supabase
    .from("notebooks")
    .insert(notebook)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating notebook:", error);
    throw error;
  }
  
  return data;
};

export const updateNotebook = async (id: string, updates: Partial<Notebook>): Promise<Notebook> => {
  const { data, error } = await supabase
    .from("notebooks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating notebook:", error);
    throw error;
  }
  
  return data;
};

export const deleteNotebook = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("notebooks")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting notebook:", error);
    throw error;
  }
};

// Tags API
export const fetchTags = async (): Promise<Tag[]> => {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("Error fetching tags:", error);
    throw error;
  }
  
  return data || [];
};

export const createTag = async (tag: { name: string; color: string }): Promise<Tag> => {
  const { data, error } = await supabase
    .from("tags")
    .insert(tag)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating tag:", error);
    throw error;
  }
  
  return data;
};

export const updateTag = async (id: string, updates: Partial<Tag>): Promise<Tag> => {
  const { data, error } = await supabase
    .from("tags")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating tag:", error);
    throw error;
  }
  
  return data;
};

export const deleteTag = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting tag:", error);
    throw error;
  }
};

// Notes API with tags
export const fetchNotes = async (): Promise<NoteWithTags[]> => {
  // First, fetch all notes
  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (notesError) {
    console.error("Error fetching notes:", notesError);
    throw notesError;
  }
  
  if (!notes || notes.length === 0) {
    return [];
  }
  
  // Fetch all tags for these notes
  const noteIds = notes.map(note => note.id);
  const { data: noteTags, error: noteTagsError } = await supabase
    .from("note_tags")
    .select("note_id, tag_id, tags(id, name, color)")
    .in("note_id", noteIds);
  
  if (noteTagsError) {
    console.error("Error fetching note tags:", noteTagsError);
    throw noteTagsError;
  }
  
  // Group tags by note_id
  const tagsByNoteId = (noteTags || []).reduce((acc, item) => {
    const noteId = item.note_id;
    const tag = item.tags;
    
    if (!acc[noteId]) {
      acc[noteId] = [];
    }
    
    if (tag) {
      acc[noteId].push(tag);
    }
    
    return acc;
  }, {} as Record<string, Tag[]>);
  
  // Combine notes with their tags
  return notes.map(note => ({
    ...note,
    tags: tagsByNoteId[note.id] || []
  }));
};

export const fetchNoteById = async (id: string): Promise<NoteWithTags> => {
  // Fetch the note
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  
  if (noteError) {
    console.error("Error fetching note:", noteError);
    throw noteError;
  }
  
  // Fetch tags for this note
  const { data: noteTags, error: noteTagsError } = await supabase
    .from("note_tags")
    .select("tag_id, tags(id, name, color)")
    .eq("note_id", id);
  
  if (noteTagsError) {
    console.error("Error fetching note tags:", noteTagsError);
    throw noteTagsError;
  }
  
  // Extract tags from the response
  const tags = (noteTags || [])
    .map(item => item.tags)
    .filter(tag => tag !== null) as Tag[];
  
  return {
    ...note,
    tags
  };
};

export const createNote = async (
  note: {
    title: string;
    content?: string;
    notebook_id?: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  },
  tagIds: string[] = []
): Promise<NoteWithTags> => {
  // Start a transaction
  const { data: newNote, error: noteError } = await supabase
    .from("notes")
    .insert(note)
    .select()
    .single();
  
  if (noteError) {
    console.error("Error creating note:", noteError);
    throw noteError;
  }
  
  // If tags are provided, create associations
  if (tagIds.length > 0) {
    const noteTagsToInsert = tagIds.map(tagId => ({
      note_id: newNote.id,
      tag_id: tagId
    }));
    
    const { error: tagLinkError } = await supabase
      .from("note_tags")
      .insert(noteTagsToInsert);
    
    if (tagLinkError) {
      console.error("Error linking tags to note:", tagLinkError);
      throw tagLinkError;
    }
  }
  
  // Fetch the tags to return with the note
  const { data: noteTags, error: fetchTagsError } = await supabase
    .from("note_tags")
    .select("tag_id, tags(id, name, color)")
    .eq("note_id", newNote.id);
  
  if (fetchTagsError) {
    console.error("Error fetching tags for new note:", fetchTagsError);
    throw fetchTagsError;
  }
  
  // Extract tags from the response
  const tags = (noteTags || [])
    .map(item => item.tags)
    .filter(tag => tag !== null) as Tag[];
  
  return {
    ...newNote,
    tags
  };
};

export const updateNote = async (
  id: string, 
  updates: Partial<Note>,
  tagIds?: string[]
): Promise<NoteWithTags> => {
  // Update the note
  const { data: updatedNote, error: noteError } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (noteError) {
    console.error("Error updating note:", noteError);
    throw noteError;
  }
  
  // If tagIds are provided, update the tag associations
  if (tagIds !== undefined) {
    // First, remove all existing tag associations
    const { error: deleteError } = await supabase
      .from("note_tags")
      .delete()
      .eq("note_id", id);
    
    if (deleteError) {
      console.error("Error removing existing tags:", deleteError);
      throw deleteError;
    }
    
    // Then, add new tag associations
    if (tagIds.length > 0) {
      const noteTagsToInsert = tagIds.map(tagId => ({
        note_id: id,
        tag_id: tagId
      }));
      
      const { error: insertError } = await supabase
        .from("note_tags")
        .insert(noteTagsToInsert);
      
      if (insertError) {
        console.error("Error linking tags to note:", insertError);
        throw insertError;
      }
    }
  }
  
  // Fetch the tags to return with the note
  const { data: noteTags, error: fetchTagsError } = await supabase
    .from("note_tags")
    .select("tag_id, tags(id, name, color)")
    .eq("note_id", id);
  
  if (fetchTagsError) {
    console.error("Error fetching tags for updated note:", fetchTagsError);
    throw fetchTagsError;
  }
  
  // Extract tags from the response
  const tags = (noteTags || [])
    .map(item => item.tags)
    .filter(tag => tag !== null) as Tag[];
  
  return {
    ...updatedNote,
    tags
  };
};

export const deleteNote = async (id: string): Promise<void> => {
  // Delete note (note_tags will be deleted via cascade)
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id);
  
  if (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
};

// React Query Hooks
export const useNotebooks = () => {
  return useQuery({
    queryKey: ["notebooks"],
    queryFn: fetchNotebooks,
  });
};

export const useTags = () => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });
};

export const useNotes = () => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
  });
};

export const useNote = (id: string) => {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => fetchNoteById(id),
    enabled: !!id,
  });
};

// Mutation hooks
export const useCreateNotebook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createNotebook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
};

export const useUpdateNotebook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Notebook> }) => 
      updateNotebook(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
};

export const useDeleteNotebook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteNotebook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => 
      updateTag(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ note, tagIds }: { note: Partial<Note>, tagIds?: string[] }) => 
      createNote(note, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates, tagIds }: { id: string; updates: Partial<Note>; tagIds?: string[] }) => 
      updateNote(id, updates, tagIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", variables.id] });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
};
