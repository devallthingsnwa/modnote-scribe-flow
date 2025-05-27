
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Bold, Italic, List, ListChecks, Save, Video } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";
import { AIProcessingButton } from "@/components/AIProcessingButton";
import { AIChatModal } from "@/components/AIChatModal";
import { YouTubeTranscriptIntegration } from "@/components/YouTubeTranscriptIntegration";
import { useIsMobile } from "@/hooks/use-mobile";

interface NoteEditorProps {
  initialNote?: {
    id?: string;
    title: string;
    content: string | null;
    tags: string[];
  };
  onSave?: (note: {
    title: string;
    content: string | null;
    tags: string[];
  }) => void;
}

export function NoteEditor({
  initialNote,
  onSave
}: NoteEditorProps) {
  const isMobile = useIsMobile();
  const [note, setNote] = useState({
    title: initialNote?.title || "",
    content: initialNote?.content || "",
    tags: initialNote?.tags || []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showYouTubeExtractor, setShowYouTubeExtractor] = useState(false);

  useEffect(() => {
    if (initialNote) {
      setNote({
        title: initialNote.title,
        content: initialNote.content || "",
        tags: initialNote.tags
      });
    }
  }, [initialNote]);

  // Check if content contains YouTube URLs
  useEffect(() => {
    const hasYouTubeUrl = note.content.includes('youtube.com') || note.content.includes('youtu.be');
    setShowYouTubeExtractor(hasYouTubeUrl);
  }, [note.content]);

  const handleSave = () => {
    if (onSave) {
      setIsSaving(true);
      try {
        onSave(note);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleTagChange = (selectedTags: string[]) => {
    setNote(prev => ({ ...prev, tags: selectedTags }));
  };

  const handleTranscriptExtracted = (extractedContent: string) => {
    setNote(prev => ({
      ...prev,
      content: extractedContent,
      // Extract title from the extracted content if current title is empty
      title: prev.title || extractedContent.split('\n')[0].replace('# 🎥 ', '') || "YouTube Video Transcript"
    }));
  };

  const insertFormatting = (format: string) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = note.content.substring(start, end);
    
    let replacement = "";
    switch (format) {
      case "bold":
        replacement = `**${selectedText}**`;
        break;
      case "italic":
        replacement = `*${selectedText}*`;
        break;
      case "list":
        replacement = selectedText.split('\n').map(line => line.trim() ? `- ${line}` : line).join('\n');
        break;
      case "checklist":
        replacement = selectedText.split('\n').map(line => line.trim() ? `- [ ] ${line}` : line).join('\n');
        break;
    }

    const newContent = note.content.substring(0, start) + replacement + note.content.substring(end);
    setNote(prev => ({ ...prev, content: newContent }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <Input
          placeholder="Note title..."
          value={note.title}
          onChange={(e) => setNote(prev => ({ ...prev, title: e.target.value }))}
          className="text-lg font-medium"
        />
        
        {/* YouTube Transcript Integration */}
        {showYouTubeExtractor && (
          <YouTubeTranscriptIntegration
            onTranscriptExtracted={handleTranscriptExtracted}
          />
        )}
      </div>

      {/* Formatting Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("checklist")}
            >
              <ListChecks className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-px bg-border mx-2" />
            
            <AIProcessingButton
              content={note.content}
              onProcessed={(processedContent) => 
                setNote(prev => ({ ...prev, content: processedContent }))
              }
            />
            
            <AIChatModal
              noteContent={note.content}
              noteTitle={note.title}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Editor */}
      <div className="space-y-4">
        <Textarea
          placeholder="Start writing your note... (Paste YouTube URLs to auto-detect transcript extraction)"
          value={note.content}
          onChange={(e) => setNote(prev => ({ ...prev, content: e.target.value }))}
          className="min-h-[300px] resize-none"
          rows={isMobile ? 12 : 15}
        />
      </div>

      {/* Tags */}
      <TagSelector
        selectedTags={note.tags}
        onTagsChange={handleTagChange}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || !note.title.trim()}
          className="min-w-[100px]"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
