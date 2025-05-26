
import { useState } from "react";
import { Search, Plus, FileText, Play, Video, ChevronLeft, ChevronRight, Upload } from "lucide-react";
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
  onImport?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function NotesListPanel({ 
  notes, 
  selectedNoteId, 
  onNoteSelect, 
  onNewNote, 
  searchQuery, 
  onSearchChange,
  isLoading,
  onImport,
  isCollapsed = false,
  onToggleCollapse
}: NotesListPanelProps) {
  const renderNoteIcon = (note: Note) => {
    // If it's a video note with thumbnail, show thumbnail
    if (note.thumbnail && (note.is_transcription || note.source_url)) {
      return (
        <div className="w-12 h-9 rounded-md overflow-hidden flex-shrink-0 bg-muted relative">
          <img 
            src={note.thumbnail} 
            alt={note.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-full flex items-center justify-center bg-red-500/10 absolute top-0 left-0">
            <Video className="h-4 w-4 text-red-500" />
          </div>
          {/* Video indicator overlay */}
          <div className="absolute bottom-0 right-0 bg-red-500 text-white rounded-tl px-1">
            <Play className="h-2 w-2" />
          </div>
        </div>
      );
    }
    
    // If it's a video note without thumbnail, show video icon
    if (note.is_transcription || note.source_url?.includes('youtube')) {
      return (
        <div className="w-12 h-9 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <Video className="h-4 w-4 text-red-500" />
        </div>
      );
    }
    
    // For regular text notes, show document icon
    return (
      <div className="w-12 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-background border-r border-border">
        <div className="p-2 border-b border-border flex justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 p-2">
          <Button 
            onClick={onNewNote} 
            size="icon"
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {onImport && (
            <Button 
              onClick={onImport} 
              variant="outline"
              size="icon"
              className="h-8 w-8"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Notes</h2>
            {onToggleCollapse && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleCollapse}
                className="h-6 w-6"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onImport && (
              <Button onClick={onImport} size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            )}
            <Button onClick={onNewNote} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
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
                  "p-3 mb-2 cursor-pointer transition-all hover:shadow-sm border",
                  selectedNoteId === note.id 
                    ? "bg-primary/10 border-primary/30 shadow-md" 
                    : "hover:bg-muted/50 border-border"
                )}
                onClick={() => onNoteSelect(note.id)}
              >
                <div className="flex gap-3">
                  {/* Note Icon/Thumbnail */}
                  {renderNoteIcon(note)}
                  
                  {/* Note Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm line-clamp-2 flex-1">
                        {note.title || "Untitled Note"}
                      </h3>
                    </div>
                    
                    {note.content && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {note.content.length > 100 ? `${note.content.substring(0, 100)}...` : note.content}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-1">
                        {note.is_transcription && (
                          <Badge variant="secondary" className="text-xs px-1 h-4">
                            <Video className="h-2 w-2 mr-1" />
                            Video
                          </Badge>
                        )}
                        {note.tags.length > 0 && (
                          <div className="flex gap-1">
                            {note.tags.slice(0, 1).map((tag) => (
                              <Badge key={tag.id} variant="secondary" className="text-xs px-1 h-4">
                                {tag.name}
                              </Badge>
                            ))}
                            {note.tags.length > 1 && (
                              <Badge variant="secondary" className="text-xs px-1 h-4">
                                +{note.tags.length - 1}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
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
