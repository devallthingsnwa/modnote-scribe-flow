
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
  Bell,
  Share2
} from "lucide-react";
import { Logo } from "@/components/Logo";
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
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo and Primary Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1 h-8 w-8"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          
          <Logo size="md" />
          
          <div className="flex items-center gap-2">
            {/* Notes Button */}
            <Button 
              onClick={onNewNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-9"
            >
              <FileText className="w-4 h-4 mr-2" />
              Notes
            </Button>
            
            {/* Add Multi Media Button */}
            <Button 
              variant="outline"
              className="border-gray-300 hover:bg-gray-50 px-4 py-2 h-9"
              onClick={() => setTranscriptModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Multi Media
            </Button>
            
            {/* Upload Button */}
            <Button 
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50 px-4 py-2 h-9"
              onClick={() => setFileUploadModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Center Section - Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Type to search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right Section - AI, Notifications, Profile, Share */}
        <div className="flex items-center gap-3">
          {/* Ask AI Button */}
          <Button 
            variant="outline"
            className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100 px-4 py-2 h-9"
          >
            <Mic className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
          
          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-gray-600" />
          </Button>
          
          {/* Share Button */}
          <Button 
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 px-4 py-2 h-9"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">SL</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Sam Lee</div>
                    <div className="text-xs text-gray-500">S.L Mobbin</div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Account Settings</DropdownMenuItem>
              <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* View Toggle Buttons */}
          <div className="flex items-center gap-2 ml-4 border-l border-gray-200 pl-4">
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
      </div>
      
      {/* Select Mode Actions */}
      {isSelectMode && selectedNoteIds.length > 0 && (
        <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedNoteIds.length} selected</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectModeToggle}
              className="gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Select
            </Button>
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
