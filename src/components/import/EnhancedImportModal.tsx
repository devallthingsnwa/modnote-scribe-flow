import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Upload, Video, Mic, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { YoutubeImportForm } from "./YoutubeImportForm";
import { AudioImportForm } from "./AudioImportForm";

import { UrlImporter } from './UrlImporter';

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => void;
}

export function EnhancedImportModal({ isOpen, onClose, onImport }: EnhancedImportModalProps) {
  const { toast } = useToast();
  const [isYoutubeImporting, setIsYoutubeImporting] = useState(false);
  const [isAudioImporting, setIsAudioImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'audio' | 'url'>('youtube');

  const handleYoutubeImport = (processedContent: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => {
    setIsYoutubeImporting(true);
    onImport(processedContent);
    onClose();
    toast({
      title: "YouTube Content Imported",
      description: "Successfully imported content from YouTube as a new note.",
    });
    setIsYoutubeImporting(false);
  };

  const handleAudioImport = (processedContent: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => {
    setIsAudioImporting(true);
    onImport(processedContent);
    onClose();
    toast({
      title: "Audio Content Imported",
      description: "Successfully imported content from audio as a new note.",
    });
    setIsAudioImporting(false);
  };

  const handleUrlImport = (content: { title: string; content: string; sourceUrl: string }) => {
    const processedContent = {
      title: content.title,
      content: content.content,
      source_url: content.sourceUrl,
      is_transcription: false
    };
    
    onImport(processedContent);
    onClose();
    
    toast({
      title: "URL Content Imported",
      description: "Successfully imported content from URL as a new note.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Content
          </DialogTitle>
          <DialogDescription>
            Import content from YouTube videos, audio files, or web URLs
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web URL
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="youtube" className="mt-4 h-full">
              <YoutubeImportForm
                onContentImported={handleYoutubeImport}
                isLoading={isYoutubeImporting}
              />
            </TabsContent>

            <TabsContent value="audio" className="mt-4 h-full">
              <AudioImportForm
                onContentImported={handleAudioImport}
                isLoading={isAudioImporting}
              />
            </TabsContent>

            <TabsContent value="url" className="mt-4 h-full">
              <UrlImporter onContentImported={handleUrlImport} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
