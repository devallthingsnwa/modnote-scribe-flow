
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
import { Upload, Mic, Globe, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AudioImportForm } from "./AudioImportForm";
import { UrlImporter } from './UrlImporter';
import { FileUploadForm } from './FileUploadForm';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
}

export function EnhancedImportModal({ isOpen, onClose, onImport }: EnhancedImportModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAudioImporting, setIsAudioImporting] = useState(false);
  const [isFileImporting, setIsFileImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'url' | 'files'>('audio');

  const saveToSupabase = async (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    if (!user) {
      throw new Error("You must be logged in to import content");
    }

    console.log("💾 Saving content to Supabase:", {
      title: content.title,
      contentLength: content.content.length,
      sourceUrl: content.source_url,
      isTranscription: content.is_transcription
    });

    const noteData = {
      user_id: user.id,
      title: content.title,
      content: content.content,
      source_url: content.source_url || null,
      thumbnail: content.thumbnail || null,
      is_transcription: content.is_transcription || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedNote, error: insertError } = await supabase
      .from('notes')
      .insert([noteData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
      throw new Error(`Failed to save note to database: ${insertError.message}`);
    }

    if (!insertedNote) {
      console.error("❌ No note data returned after insert");
      throw new Error("Failed to save note - no data returned");
    }

    console.log("✅ Note successfully saved to Supabase:", {
      id: insertedNote.id,
      title: insertedNote.title,
      createdAt: insertedNote.created_at
    });

    return insertedNote;
  };

  const handleAudioImport = async (processedContent: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => {
    setIsAudioImporting(true);
    
    try {
      await saveToSupabase(processedContent);
      onImport(processedContent);
      onClose();
      
      toast({
        title: "Audio Content Imported",
        description: "Successfully imported content from audio as a new note.",
      });
    } catch (error) {
      console.error("💥 Audio import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import audio content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAudioImporting(false);
    }
  };

  const handleFileImport = async (processedContent: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => {
    setIsFileImporting(true);
    
    try {
      await saveToSupabase(processedContent);
      onImport(processedContent);
      onClose();
      
      toast({
        title: "File Imported",
        description: "Successfully imported file as a new note.",
      });
    } catch (error) {
      console.error("💥 File import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFileImporting(false);
    }
  };

  const handleUrlImport = async (content: { title: string; content: string; sourceUrl: string }) => {
    try {
      const processedContent = {
        title: content.title,
        content: content.content,
        source_url: content.sourceUrl,
        is_transcription: false
      };
      
      await saveToSupabase(processedContent);
      onImport(processedContent);
      onClose();
      
      toast({
        title: "URL Content Imported",
        description: "Successfully imported content from URL as a new note.",
      });
    } catch (error) {
      console.error("💥 URL import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import URL content. Please try again.",
        variant: "destructive",
      });
    }
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
            Import content from audio files, web URLs, or upload documents
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web URL
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="audio" className="mt-4 h-full">
              <AudioImportForm
                onContentImported={handleAudioImport}
                isLoading={isAudioImporting}
              />
            </TabsContent>

            <TabsContent value="url" className="mt-4 h-full">
              <UrlImporter onContentImported={handleUrlImport} />
            </TabsContent>

            <TabsContent value="files" className="mt-4 h-full">
              <FileUploadForm
                onContentImported={handleFileImport}
                isLoading={isFileImporting}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
