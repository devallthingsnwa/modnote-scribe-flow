
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Enhanced Note interface for ModNote
export interface ModNote {
  id: string;
  title: string;
  content: string | null;
  notebook_id: string | null;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  source_url: string | null;
  is_transcription: boolean | null;
  due_date: string | null;
  reminder_date: string | null;
  task_progress: { completed: number; total: number } | null;
  is_reminder: boolean | null;
  shared_permissions: any[] | null;
  user_id: string;
}

export interface ModNotebook {
  id: string;
  name: string;
  description: string | null;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ModTag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface ModFile {
  id: string;
  name: string;
  size: number | null;
  mime_type: string | null;
  file_path: string;
  note_id: string | null;
  user_id: string;
  created_at: string;
}

// Notes API
export const fetchModNotes = async (): Promise<ModNote[]> => {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching notes:", error);
    throw error;
  }
  
  return data || [];
};

export const fetchReminderNotes = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase.rpc('get_reminder_notes', {
    user_uuid: user.id
  });

  if (error) {
    console.error("Error fetching reminder notes:", error);
    throw error;
  }

  return data || [];
};

export const searchModNotes = async (searchTerm: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase.rpc('search_notes', {
    search_term: searchTerm,
    user_uuid: user.id
  });

  if (error) {
    console.error("Error searching notes:", error);
    throw error;
  }

  return data || [];
};

export const createModNote = async (note: {
  title: string;
  content?: string | null;
  notebook_id?: string | null;
  is_reminder?: boolean;
  due_date?: string | null;
  reminder_date?: string | null;
}): Promise<ModNote> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated to create a note");
  }
  
  const { data, error } = await supabase
    .from("notes")
    .insert({
      ...note,
      user_id: user.id,
      task_progress: { completed: 0, total: 0 }
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating note:", error);
    throw error;
  }
  
  return data;
};

export const updateModNote = async (id: string, updates: Partial<ModNote>): Promise<ModNote> => {
  const { data, error } = await supabase
    .from("notes")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating note:", error);
    throw error;
  }
  
  return data;
};

export const shareNote = async (noteId: string, userEmails: string[], permissions: string) => {
  const { data, error } = await supabase
    .from("notes")
    .update({
      shared_permissions: {
        users: userEmails,
        permission: permissions
      }
    })
    .eq("id", noteId)
    .select()
    .single();
  
  if (error) {
    console.error("Error sharing note:", error);
    throw error;
  }
  
  return data;
};

// Files API
export const uploadFile = async (file: File, noteId?: string): Promise<ModFile> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be authenticated to upload files");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;
  
  // Note: This would require setting up Supabase Storage bucket
  // For now, we'll create a file record without actual storage
  const { data, error } = await supabase
    .from("files")
    .insert({
      name: file.name,
      size: file.size,
      mime_type: file.type,
      file_path: fileName,
      note_id: noteId,
      user_id: user.id
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating file record:", error);
    throw error;
  }
  
  return data;
};

// React Query Hooks
export const useModNotes = () => {
  return useQuery({
    queryKey: ["mod-notes"],
    queryFn: fetchModNotes,
  });
};

export const useReminderNotes = () => {
  return useQuery({
    queryKey: ["reminder-notes"],
    queryFn: fetchReminderNotes,
  });
};

export const useSearchNotes = (searchTerm: string) => {
  return useQuery({
    queryKey: ["search-notes", searchTerm],
    queryFn: () => searchModNotes(searchTerm),
    enabled: searchTerm.length > 0,
  });
};

export const useCreateModNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createModNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-notes"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-notes"] });
    },
  });
};

export const useUpdateModNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ModNote> }) => 
      updateModNote(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-notes"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-notes"] });
    },
  });
};

export const useShareNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ noteId, userEmails, permissions }: { 
      noteId: string; 
      userEmails: string[]; 
      permissions: string 
    }) => shareNote(noteId, userEmails, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-notes"] });
    },
  });
};

export const useUploadFile = () => {
  return useMutation({
    mutationFn: ({ file, noteId }: { file: File; noteId?: string }) => 
      uploadFile(file, noteId),
  });
};
