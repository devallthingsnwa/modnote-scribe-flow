
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Plus,
  Upload,
  FileText,
  Sparkles,
  Bell,
  Share2,
  ChevronDown,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUploadModal } from "./FileUploadModal";
import { AIAssistantModal } from "./AIAssistantModal";

interface ModNoteHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  isNoteEditing?: boolean;
}

export function ModNoteHeader({
  searchQuery,
  onSearchChange,
  onNewNote,
  isNoteEditing = false
}: ModNoteHeaderProps) {
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-gray-900">ModNote</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={onNewNote} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="w-4 h-4 mr-2" />
              Note
            </Button>
            
            <Button variant="outline" onClick={() => setFileUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Multi Media
            </Button>
            
            <Button variant="outline" onClick={() => setFileUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Type to search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setAiAssistantOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
          
          {isNoteEditing && (
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
          
          <Button variant="ghost" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/api/placeholder/32/32" />
                  <AvatarFallback>SL</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-medium">Sam Lee</div>
                  <div className="text-xs text-gray-500">S.L Mobbin</div>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Account Management</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuItem>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      <FileUploadModal
        isOpen={fileUploadOpen}
        onClose={() => setFileUploadOpen(false)}
        onFileUploaded={() => setFileUploadOpen(false)}
      />
      
      <AIAssistantModal
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />
    </header>
  );
}
