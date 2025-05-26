
import { useState } from "react";
import { Search, Plus, FileText, Play, Video, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  thumbnail?: string | null;
  source_url?: string | null;
  is_transcription?: boolean;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface NotesListPanelProps {
  notes: Note[];
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onNewNote: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

export function NotesListPanel({ 
  notes, 
  selectedNoteId, 
  onNoteSelect, 
  onNewNote, 
  searchQuery, 
  onSearchChange,
  isLoading 
}: NotesListPanelProps) {
  const renderNoteIcon = (note: Note) => {
    // If it's a video note with thumbnail, show thumbnail
    if (note.thumbnail && (note.is_transcription || note.source_url)) {
      return (
        <div className="w-16 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
          <img 
            src={note.thumbnail} 
            alt={note.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to video icon if thumbnail fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center bg-red-500/10">
            <Video className="h-6 w-6 text-red-500" />
          </div>
        </div>
      );
    }
    
    // If it's a video note without thumbnail, show video icon
    if (note.is_transcription || note.source_url?.includes('youtube')) {
      return (
        <div className="w-16 h-12 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <Video className="h-6 w-6 text-red-500" />
        </div>
      );
    }
    
    // For regular text notes, show document icon
    return (
      <div className="w-16 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-6 w-6 text-primary" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button onClick={onNewNote} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-muted-foreground mb-2">No notes found</div>
            <Button onClick={onNewNote} variant="outline" size="sm">
              Create your first note
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {notes.map((note) => (
              <Card
                key={note.id}
                className={cn(
                  "p-3 mb-2 cursor-pointer transition-all hover:shadow-sm",
                  selectedNoteId === note.id 
                    ? "bg-primary/10 border-primary/30" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => onNoteSelect(note.id)}
              >
                <div className="flex gap-3">
                  {/* Note Icon/Thumbnail */}
                  {renderNoteIcon(note)}
                  
                  {/* Note Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm line-clamp-1 flex-1">
                        {note.title || "Untitled Note"}
                      </h3>
                      {note.is_transcription && (
                        <Play className="h-4 w-4 text-red-500 ml-2 flex-shrink-0" />
                      )}
                    </div>
                    
                    {note.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {note.content}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                      </span>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1">
                          {note.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="text-xs px-1">
                              {tag.name}
                            </Badge>
                          ))}
                          {note.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-1">
                              +{note.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
