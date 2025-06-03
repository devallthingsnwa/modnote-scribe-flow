
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Mail, Link, Eye, Edit, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
}

export function ShareModal({ isOpen, onClose, noteId, noteTitle }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"view" | "comment" | "edit">("view");
  const { toast } = useToast();

  const shareLink = `https://modnote.app/shared/${noteId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleSendInvite = () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    // Simulate sending invite
    toast({
      title: "Invitation sent",
      description: `Invite sent to ${email} with ${accessLevel} access`,
    });
    setEmail("");
  };

  const accessLevels = [
    { value: "view", label: "View only", icon: Eye, description: "Can view the note" },
    { value: "comment", label: "Comment", icon: MessageSquare, description: "Can view and comment" },
    { value: "edit", label: "Edit", icon: Edit, description: "Can view, comment, and edit" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-teal-500" />
            Share "{noteTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Share Link */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input 
                value={shareLink} 
                readOnly 
                className="bg-gray-50"
              />
              <Button onClick={handleCopyLink} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Access Level Selection */}
          <div className="space-y-3">
            <Label>Access Level</Label>
            <div className="space-y-2">
              {accessLevels.map((level) => (
                <div
                  key={level.value}
                  onClick={() => setAccessLevel(level.value as any)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    accessLevel === level.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <level.icon className="w-4 h-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{level.label}</div>
                      <div className="text-xs text-gray-500">{level.description}</div>
                    </div>
                    {accessLevel === level.value && (
                      <Badge variant="default" className="bg-blue-500 text-white text-xs">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email Invite */}
          <div className="space-y-2">
            <Label>Invite by Email</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <Button onClick={handleSendInvite} className="bg-teal-500 hover:bg-teal-600">
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
