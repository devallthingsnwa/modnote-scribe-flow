
import { useState } from "react";
import { Search, Bell, Settings, Plus, Upload, Sparkles, ChevronDown } from "lucide-react";
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
import { useCreateModNote, useSearchNotes } from "@/lib/modNoteApi";
import { AskAIModal } from "./AskAIModal";
import { ShareModal } from "./ShareModal";
import { FileUploadModal } from "./FileUploadModal";
import { useToast } from "@/hooks/use-toast";

interface ModNoteHeaderProps {
  onNewNote?: () => void;
  selectedNoteId?: string;
  selectedNoteTitle?: string;
  onAIResponse?: (response: string) => void;
  currentNoteContent?: string;
}

export function ModNoteHeader({ 
  onNewNote, 
  selectedNoteId, 
  selectedNoteTitle, 
  onAIResponse,
  currentNoteContent 
}: ModNoteHeaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMultiMediaModal, setShowMultiMediaModal] = useState(false);
  
  const createNoteMutation = useCreateModNote();
  const { data: searchResults } = useSearchNotes(searchQuery);

  const handleNewNote = async () => {
    try {
      const newNote = await createNoteMutation.mutateAsync({
        title: "Untitled Note",
        content: "",
      });
      
      toast({
        title: "New note created",
        description: "Your new note is ready for editing.",
      });
      
      onNewNote?.();
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

  const handleSignOut = async () => {
    try {
      await user?.signOut?.();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Action buttons */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleNewNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-md"
              disabled={createNoteMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Note
            </Button>
            <Button 
              onClick={() => setShowMultiMediaModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm rounded-md"
            >
              Add Multi Media
            </Button>
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-400 hover:bg-purple-500 text-white px-4 py-2 text-sm rounded-md"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Type to search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white rounded-md"
              />
              
              {/* Search Results Dropdown */}
              {searchQuery && searchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => {
                        // Handle note selection
                        setSearchQuery("");
                      }}
                    >
                      <h4 className="font-medium text-sm text-gray-900">{note.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {note.content?.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side - User actions */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setShowAIModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm rounded-md"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AI
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
            </Button>
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
                    <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || "SL"}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {user?.email?.split('@')[0] || "Sam Lee"}
                    </div>
                    <div className="text-gray-500 text-xs">ModNote User</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
                <DropdownMenuItem>Account</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={handleShare}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 text-sm rounded-md ml-2"
            >
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <AskAIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onAIResponse={onAIResponse || (() => {})}
        context={currentNoteContent}
      />
      
      {selectedNoteId && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          noteId={selectedNoteId}
          noteTitle={selectedNoteTitle || "Untitled Note"}
        />
      )}
      
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
      
      <FileUploadModal
        isOpen={showMultiMediaModal}
        onClose={() => setShowMultiMediaModal(false)}
        noteId={selectedNoteId}
      />
    </>
  );
}
