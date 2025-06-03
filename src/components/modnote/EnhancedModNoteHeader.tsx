import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Plus,
  Upload,
  Mic,
  FileText,
  Grid3X3,
  List,
  CheckSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { FileUploadModal } from "./FileUploadModal";
import { TranscriptUploadModal } from "./TranscriptUploadModal";
import { FileManagerShortcut } from "@/components/files/FileManagerShortcut";

interface EnhancedModNoteHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSelectMode: boolean;
  selectedNoteIds: string[];
  onSelectModeToggle: () => void;
  onBulkDelete: () => void;
  onNewNote: () => void;
  onImport: () => void;
  onTranscriptUpload: () => void;
  onFileUpload: () => void;
  activeView: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function EnhancedModNoteHeader({
  searchQuery,
  onSearchChange,
  isSelectMode,
  selectedNoteIds,
  onSelectModeToggle,
  onBulkDelete,
  onNewNote,
  onImport,
  onTranscriptUpload,
  onFileUpload,
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
}: EnhancedModNoteHeaderProps) {
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);

  return (
    <header className="border-b p-4 bg-background">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1 h-8 w-8"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          
          <h1 className="text-xl font-semibold">ModNote</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={activeView === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewNote}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Note
          </Button>
          
          <FileManagerShortcut onFileUploaded={() => {}} />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTranscriptModalOpen(true)}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Transcript
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectModeToggle}
            className="gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Select
          </Button>
        </div>
      </div>
      
      {isSelectMode && selectedNoteIds.length > 0 && (
        <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedNoteIds.length} selected</Badge>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
        </div>
      )}

      <FileUploadModal
        isOpen={fileUploadModalOpen}
        onClose={() => setFileUploadModalOpen(false)}
        onFileUploaded={() => {
          setFileUploadModalOpen(false);
          if (onFileUpload) onFileUpload();
        }}
      />

      <TranscriptUploadModal
        isOpen={transcriptModalOpen}
        onClose={() => setTranscriptModalOpen(false)}
        onSuccess={() => {
          setTranscriptModalOpen(false);
          if (onTranscriptUpload) onTranscriptUpload();
        }}
      />
    </header>
  );
}
