
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileService } from "@/lib/fileService";

export function useUserFiles(noteId?: string) {
  return useQuery({
    queryKey: ["user-files", noteId],
    queryFn: () => FileService.getUserFiles(noteId),
  });
}

export function useFileUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, noteId }: { file: File; noteId?: string }) =>
      FileService.uploadFile(file, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
    },
  });
}

export function useFileDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => FileService.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
    },
  });
}
