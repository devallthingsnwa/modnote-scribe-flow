
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Share, X, UserPlus } from "lucide-react";
import { useShareNote } from "@/lib/modNoteApi";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
}

export function ShareModal({ isOpen, onClose, noteId, noteTitle }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [sharedUsers, setSharedUsers] = useState<Array<{email: string, permission: string}>>([]);
  const shareNoteMutation = useShareNote();
  const { toast } = useToast();

  const handleAddUser = () => {
    if (!email.trim()) return;
    
    if (sharedUsers.find(user => user.email === email)) {
      toast({
        title: "User already added",
        description: "This user is already in the share list.",
        variant: "destructive",
      });
      return;
    }

    setSharedUsers([...sharedUsers, { email: email.trim(), permission }]);
    setEmail("");
  };

  const handleRemoveUser = (emailToRemove: string) => {
    setSharedUsers(sharedUsers.filter(user => user.email !== emailToRemove));
  };

  const handleShare = async () => {
    if (sharedUsers.length === 0) {
      toast({
        title: "No users to share with",
        description: "Please add at least one user to share with.",
        variant: "destructive",
      });
      return;
    }

    try {
      await shareNoteMutation.mutateAsync({
        noteId,
        userEmails: sharedUsers.map(u => u.email),
        permissions: permission
      });
      
      toast({
        title: "Note shared successfully",
        description: `"${noteTitle}" has been shared with ${sharedUsers.length} user(s).`,
      });
      
      onClose();
      setSharedUsers([]);
    } catch (error) {
      toast({
        title: "Error sharing note",
        description: "Failed to share the note. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5 text-teal-500" />
            Share "{noteTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                className="flex-1"
              />
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleAddUser} 
              variant="outline" 
              className="w-full"
              disabled={!email.trim()}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>

          {sharedUsers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Shared with:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {sharedUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{user.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.permission}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(user.email)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleShare}
              disabled={sharedUsers.length === 0 || shareNoteMutation.isPending}
              className="bg-teal-500 hover:bg-teal-600"
            >
              Share Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
