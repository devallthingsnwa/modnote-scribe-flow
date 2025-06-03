
import { Home, Bookmark, FileText, Folder, Tag, Share2, Trash2, UserPlus, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface EnhancedModNoteSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export function EnhancedModNoteSidebar({ selectedSection, onSectionChange }: EnhancedModNoteSidebarProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const { toast } = useToast();

  const menuItems = [
    { icon: Home, label: "Home", key: "home" },
    { icon: Bookmark, label: "Shortcuts", key: "shortcuts" },
    { icon: FileText, label: "Notes", key: "notes", isActive: true },
    { icon: Folder, label: "Files", key: "files" },
    { icon: Folder, label: "Notebooks", key: "notebooks" },
    { icon: Tag, label: "Tags", key: "tags" },
    { icon: Share2, label: "Shared With Me", key: "shared" },
    { icon: Trash2, label: "Trash", key: "trash" },
    { icon: UserPlus, label: "Invite Users", key: "invite" },
  ];

  const handleMenuClick = (key: string) => {
    if (key === "trash") {
      setShowTrashModal(true);
    } else if (key === "invite") {
      setShowInviteModal(true);
    } else {
      onSectionChange(key);
    }
  };

  const handleInviteUser = () => {
    if (!inviteEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to invite.",
        variant: "destructive",
      });
      return;
    }

    // Simulate invite functionality
    toast({
      title: "Invitation sent",
      description: `Invite sent to ${inviteEmail}`,
    });
    setInviteEmail("");
    setShowInviteModal(false);
  };

  // Mock trash data
  const trashedNotes = [
    { id: "1", title: "Old Meeting Notes", deletedAt: "2 days ago" },
    { id: "2", title: "Project Draft", deletedAt: "1 week ago" },
    { id: "3", title: "Research Notes", deletedAt: "3 days ago" },
  ];

  const restoreNote = (noteId: string) => {
    toast({
      title: "Note restored",
      description: "The note has been restored to your notes.",
    });
  };

  const permanentlyDelete = (noteId: string) => {
    toast({
      title: "Note permanently deleted",
      description: "The note has been permanently deleted.",
      variant: "destructive",
    });
  };

  return (
    <>
      <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 p-4 pt-6">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = item.key === "notes"; // Notes is always active for this design
              return (
                <button
                  key={item.label}
                  onClick={() => handleMenuClick(item.key)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Get Started */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => setShowGetStartedModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
          >
            <Play className="w-4 h-4" />
            Get Started
          </button>
        </div>
      </div>

      {/* Invite Users Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteUser}>
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Get Started Modal */}
      <Dialog open={showGetStartedModal} onOpenChange={setShowGetStartedModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Get Started with ModNote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">1. Create Your First Note</h4>
                <p className="text-sm text-gray-600">Click the "Note" button to create a new note and start writing.</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">2. Organize with Notebooks</h4>
                <p className="text-sm text-gray-600">Group related notes together using notebooks for better organization.</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">3. Use AI Assistant</h4>
                <p className="text-sm text-gray-600">Click "Ask AI" to get help with writing, summarizing, or improving your notes.</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">4. Upload Media</h4>
                <p className="text-sm text-gray-600">Add images, videos, and documents to enrich your notes.</p>
              </div>
            </div>
            <Button onClick={() => setShowGetStartedModal(false)} className="w-full">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trash Modal */}
      <Dialog open={showTrashModal} onOpenChange={setShowTrashModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trash</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {trashedNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No items in trash</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trashedNotes.map((note) => (
                  <div key={note.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{note.title}</h4>
                      <p className="text-sm text-gray-500">Deleted {note.deletedAt}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreNote(note.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => permanentlyDelete(note.id)}
                      >
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
