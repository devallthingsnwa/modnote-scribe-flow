
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModNote {
  id: string;
  title: string;
  content?: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  thumbnail?: string | null;
  source_url?: string | null;
  is_transcription?: boolean;
  is_reminder?: boolean;
  due_date?: string | null;
  reminder_date?: string | null;
  task_progress?: any;
}

export function useModNotes() {
  return useQuery({
    queryKey: ["mod-notes"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as ModNote[];
    },
  });
}

export function useModNote(id: string) {
  return useQuery({
    queryKey: ["mod-note", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ModNote;
    },
    enabled: !!id,
  });
}

export function useCreateModNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: Partial<ModNote>) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("notes")
        .insert({
          ...note,
          user_id: session.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ModNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-notes"] });
    },
  });
}

export function useUpdateModNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ModNote> }) => {
      const { data, error } = await supabase
        .from("notes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ModNote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mod-notes"] });
      queryClient.invalidateQueries({ queryKey: ["mod-note", data.id] });
    },
  });
}

export function useDeleteModNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-notes"] });
    },
  });
}

export function useSearchNotes(query: string) {
  return useQuery({
    queryKey: ["search-notes", query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .rpc("search_notes", {
          search_term: query,
          user_uuid: session.session.user.id,
        });

      if (error) throw error;
      
      // Transform the search results to match ModNote interface
      return (data || []).map((result: any) => ({
        ...result,
        user_id: session.session.user.id,
        is_transcription: result.is_transcription || false,
        is_reminder: result.is_reminder || false,
        task_progress: result.task_progress || { total: 0, completed: 0 }
      })) as ModNote[];
    },
    enabled: !!query.trim(),
  });
}
