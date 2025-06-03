
import { useState } from "react";
import { Search, Bell, Plus, Upload, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useCreateModNote } from "@/lib/modNoteApi";
import { AskAIModal } from "./AskAIModal";
import { ShareModal } from "./ShareModal";
import { FileUploadModal } from "./FileUploadModal";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

interface EnhancedModNoteHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  selectedNoteId: string | null;
}

export function EnhancedModNoteHeader({ 
  searchQuery,
  onSearchChange,
  onNewNote,
  selectedNoteId
}: EnhancedModNoteHeaderProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showAIModal, setShowAIModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const createNoteMutation = useCreateModNote();

  const handleNewNote = async () => {
    try {
      await createNoteMutation.mutateAsync({
        title: "Untitled Note",
        content: "",
      });
      
      toast({
        title: "New note created",
        description: "Your new note is ready for editing.",
      });
      
      onNewNote();
    } catch (error) {
      toast({
        title: "Error creating note",
        description: "Failed to create a new note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    if (!selectedNoteId) {
      toast({
        title: "No note selected",
        description: "Please select a note to share.",
        variant: "destructive",
      });
      return;
    }
    setShowShareModal(true);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        {/* Left Section - Logo and Action Buttons */}
        <div className="flex items-center gap-3">
          <Logo size="md" />
          
          <div className="flex items-center gap-2">
            {/* Note Button */}
            <Button 
              onClick={handleNewNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-md h-9"
              disabled={createNoteMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Note
            </Button>
            
            {/* Add Multi Media Button */}
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm rounded-md h-9"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Multi Media
            </Button>
            
            {/* Upload Button */}
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 text-sm rounded-md h-9"
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
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white rounded-md h-9 w-full"
            />
          </div>
        </div>

        {/* Right Section - AI, Notifications, User Profile, Share */}
        <div className="flex items-center gap-3">
          {/* Ask AI Button */}
          <Button 
            onClick={() => setShowAIModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm rounded-md h-9"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
          
          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 h-9 w-9">
            <Bell className="w-4 h-4" />
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
                  <AvatarFallback className="text-xs">
                    SL
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 text-xs">
                    Sam Lee
                  </div>
                  <div className="text-gray-500 text-xs">S.L Mobbin</div>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
              <DropdownMenuItem>Account</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Share Button */}
          <Button 
            onClick={handleShare}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 text-sm rounded-md h-9"
          >
            Share
          </Button>
        </div>
      </header>

      {/* Modals */}
      <AskAIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onAIResponse={() => {}}
      />
      
      {selectedNoteId && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          noteId={selectedNoteId}
          noteTitle="Selected Note"
        />
      )}
      
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileUploaded={onNewNote}
      />
    </>
  );
}
