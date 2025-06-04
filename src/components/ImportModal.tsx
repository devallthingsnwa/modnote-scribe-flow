
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Video, Upload, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MultimediaTranscriptionAssistant } from "@/components/import/MultimediaTranscriptionAssistant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [customTitle, setCustomTitle] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleMultimediaImport = async (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to import content",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log('📥 Importing multimedia content:', content.title);
      
      onImport(content);
      
      toast({
        title: "Content Imported",
        description: `"${content.title}" has been successfully imported with enhanced formatting.`,
      });
      
      onClose();
    } catch (error) {
      console.error('💥 Import error:', error);
      toast({
        title: "Import Failed",
        description: "There was an error importing your content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualImport = () => {
    if (!customTitle.trim() || !customContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and content",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create notes",
        variant: "destructive",
      });
      return;
    }

    const currentDateTime = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    let formattedContent = `# 📝 ${customTitle}\n\n`;
    formattedContent += `**Type:** Manual Note\n`;
    formattedContent += `**Created:** ${currentDateTime}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 Content\n\n`;
    formattedContent += `${customContent}\n`;

    onImport({
      title: customTitle,
      content: formattedContent,
      is_transcription: false
    });

    // Reset form
    setCustomTitle("");
    setCustomContent("");
    onClose();

    toast({
      title: "Note Created",
      description: "Your manual note has been created successfully.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enhanced Content Import
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="multimedia" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="multimedia" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Multimedia Transcription
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="multimedia" className="mt-6">
            <MultimediaTranscriptionAssistant 
              onContentImported={handleMultimediaImport}
              isLoading={isProcessing}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="manual-title" className="block text-sm font-medium mb-2">
                  Note Title
                </label>
                <Input
                  id="manual-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter note title..."
                />
              </div>

              <div>
                <label htmlFor="manual-content" className="block text-sm font-medium mb-2">
                  Note Content
                </label>
                <Textarea
                  id="manual-content"
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Enter your note content..."
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleManualImport}
                  disabled={!customTitle.trim() || !customContent.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Note
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
