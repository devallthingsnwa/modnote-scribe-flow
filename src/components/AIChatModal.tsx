
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { AIChatPanel } from "@/components/AIChatPanel";

interface AIChatModalProps {
  noteId: string;
  content: string;
}

export function AIChatModal({ noteId, content }: AIChatModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none hover:from-blue-600 hover:to-purple-600"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          AI Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>AI Learning Assistant</DialogTitle>
        </DialogHeader>
        <div className="h-[70vh] overflow-hidden">
          <AIChatPanel noteId={noteId} content={content} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
