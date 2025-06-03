
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  File, 
  Image, 
  Video, 
  FileText, 
  Music, 
  Download, 
  Trash2, 
  Search,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserFiles, useFileDelete } from "@/hooks/useFiles";
import { FileService } from "@/lib/fileService";

interface FilesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
}

export function FilesListModal({ isOpen, onClose, noteId }: FilesListModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { data: files, isLoading, error } = useUserFiles(noteId);
  const deleteFileMutation = useFileDelete();

  const getFileIcon = (mimeType: string) => {
    if (FileService.isImageFile(mimeType)) return <Image className="w-4 h-4 text-blue-500" />;
    if (FileService.isVideoFile(mimeType)) return <Video className="w-4 h-4 text-purple-500" />;
    if (FileService.isAudioFile(mimeType)) return <Music className="w-4 h-4 text-green-500" />;
    if (FileService.isPdfFile(mimeType)) return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (file: any) => {
    const url = FileService.getFilePreviewUrl(file.storage_path);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (file: any) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await deleteFileMutation.mutateAsync(file.id);
        toast({
          title: "File deleted",
          description: `${file.name} has been deleted successfully.`,
        });
      } catch (error) {
        toast({
          title: "Delete failed",
          description: "Failed to delete file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePreview = (file: any) => {
    const url = FileService.getFilePreviewUrl(file.storage_path);
    window.open(url, '_blank');
  };

  const filteredFiles = files?.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Files</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading files. Please try again.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            {noteId ? "Note Files" : "My Files"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading files...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8">
                <File className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {searchQuery ? "No files match your search" : "No files uploaded yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    {getFileIcon(file.mime_type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                        {file.mime_type && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {file.mime_type.split('/')[0]}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(file)}
                        title="Preview"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file)}
                        title="Delete"
                        disabled={deleteFileMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
