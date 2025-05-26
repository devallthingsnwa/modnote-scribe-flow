
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { AIChatPanel } from "@/components/AIChatPanel";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">AI Learning Assistant</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[75vh] p-6 pt-4">
          <AIChatPanel noteId={noteId} content={content} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
