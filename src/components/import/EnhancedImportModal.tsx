
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
  const [isYoutubeImporting, setIsYoutubeImporting] = useState(false);
  const [isAudioImporting, setIsAudioImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'audio' | 'url'>('youtube');

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

    // Verify the note was actually saved
    const { data: verifyNote, error: verifyError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', insertedNote.id)
      .single();

    if (verifyError || !verifyNote) {
      console.error("❌ Note verification failed:", verifyError);
      throw new Error("Note was saved but could not be verified");
    }

    console.log("🔍 Note verification successful:", verifyNote.title);
    return insertedNote;
  };

  const handleYoutubeImport = async (processedContent: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => {
    setIsYoutubeImporting(true);
    
    try {
      // Save to Supabase first
      await saveToSupabase(processedContent);
      
      // Then trigger the dashboard import handler
      onImport(processedContent);
      onClose();
      
      toast({
        title: "YouTube Content Imported",
        description: "Successfully imported content from YouTube as a new note.",
      });
    } catch (error) {
      console.error("💥 YouTube import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import YouTube content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsYoutubeImporting(false);
    }
  };

  const handleAudioImport = async (processedContent: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => {
    setIsAudioImporting(true);
    
    try {
      // Save to Supabase first
      await saveToSupabase(processedContent);
      
      // Then trigger the dashboard import handler
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

  const handleUrlImport = async (content: { title: string; content: string; sourceUrl: string }) => {
    try {
      const processedContent = {
        title: content.title,
        content: content.content,
        source_url: content.sourceUrl,
        is_transcription: false
      };
      
      // Save to Supabase first
      await saveToSupabase(processedContent);
      
      // Then trigger the dashboard import handler
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
