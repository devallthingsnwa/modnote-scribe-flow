
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { File, Upload, FolderOpen } from "lucide-react";
import { FileUploadModal } from "@/components/modnote/FileUploadModal";
import { FilesListModal } from "./FilesListModal";

interface FileManagerShortcutProps {
  noteId?: string;
  onFileUploaded?: () => void;
}

export function FileManagerShortcut({ noteId, onFileUploaded }: FileManagerShortcutProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [filesListModalOpen, setFilesListModalOpen] = useState(false);

  const handleFileUploaded = () => {
    if (onFileUploaded) {
      onFileUploaded();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <File className="w-4 h-4" />
            Files
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilesListModalOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            View Files
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onFileUploaded={handleFileUploaded}
        noteId={noteId}
      />

      <FilesListModal
        isOpen={filesListModalOpen}
        onClose={() => setFilesListModalOpen(false)}
        noteId={noteId}
      />
    </>
  );
}
