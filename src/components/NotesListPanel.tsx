import { useState } from "react";
import { Search, Plus, FileText, Play, Video, ChevronLeft, ChevronRight, Upload, MoreHorizontal, Trash2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useDeleteNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
  isSelectMode?: boolean;
  selectedNoteIds?: string[];
  onSelectModeToggle?: () => void;
  onBulkDelete?: () => void;
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
  onToggleCollapse,
  isSelectMode = false,
  selectedNoteIds = [],
  onSelectModeToggle,
  onBulkDelete
}: NotesListPanelProps) {
  const {
    toast
  } = useToast();
  const deleteNoteMutation = useDeleteNote();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleBulkDeleteConfirm = async () => {
    try {
      for (const noteId of selectedNoteIds) {
        await deleteNoteMutation.mutateAsync(noteId);
      }
      toast({
        title: "Notes deleted",
        description: `${selectedNoteIds.length} note(s) deleted successfully.`
      });
      onBulkDelete?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some notes. Please try again.",
        variant: "destructive"
      });
    }
    setShowDeleteConfirm(false);
  };
  const renderNoteIcon = (note: Note) => {
    // If it's a video note with thumbnail, show thumbnail
    if (note.thumbnail && (note.is_transcription || note.source_url)) {
      return <div className="w-12 h-9 rounded-md overflow-hidden flex-shrink-0 bg-muted relative">
          <img src={note.thumbnail} alt={note.title} className="w-full h-full object-cover" onError={e => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }} />
          <div className="hidden w-full h-full flex items-center justify-center bg-red-500/10 absolute top-0 left-0">
            <Video className="h-4 w-4 text-red-500" />
          </div>
          <div className="absolute bottom-0 right-0 bg-red-500 text-white rounded-tl px-1">
            <Play className="h-2 w-2" />
          </div>
        </div>;
    }
    if (note.is_transcription || note.source_url?.includes('youtube')) {
      return <div className="w-12 h-9 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <Video className="h-4 w-4 text-red-500" />
        </div>;
    }
    return <div className="w-12 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>;
  };
  if (isCollapsed) {
    return <div className="flex flex-col h-full bg-background/50 border-r border-border">
        <div className="p-3 border-b border-border flex justify-center">
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-9 w-9 hover:bg-primary/10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-3 p-3">
          <Button onClick={onNewNote} size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
          </Button>
          {onImport && <Button onClick={onImport} variant="outline" size="icon" className="h-9 w-9 hover:bg-muted">
              <Upload className="h-4 w-4" />
            </Button>}
        </div>
      </div>;
  }
  return <div className="flex flex-col h-full bg-background">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-border space-y-4 bg-gradient-to-b from-background to-background/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {onToggleCollapse && <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 hover:bg-primary/10 flex-shrink-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>}
            {!isSelectMode && <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Notes</h2>
              </div>}
          </div>
          
          {/* Enhanced Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onSelectModeToggle && <Button onClick={onSelectModeToggle} size="sm" variant={isSelectMode ? "default" : "outline"} className="text-xs px-3 h-8 transition-all">
                <MoreHorizontal className="h-3 w-3" />
                <span className="hidden sm:inline ml-1">
                  {isSelectMode ? "Cancel" : "Select"}
                </span>
              </Button>}
            {onImport && !isSelectMode && <Button onClick={onImport} size="sm" variant="outline" className="text-xs px-3 h-8 hover:bg-primary/10 hover:border-primary/30 transition-all">
                <Upload className="h-3 w-3" />
                <span className="hidden sm:inline ml-1">Upload</span>
              </Button>}
            {!isSelectMode && <Button onClick={onNewNote} size="sm" className="text-xs px-3 h-8 bg-primary hover:bg-primary/90 shadow-sm transition-all">
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline ml-1">New</span>
              </Button>}
          </div>
        </div>

        {/* Enhanced Select Mode Actions */}
        {isSelectMode && <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium text-primary">
              {selectedNoteIds.length} note{selectedNoteIds.length !== 1 ? 's' : ''} selected
            </span>
            {selectedNoteIds.length > 0 && <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="shadow-sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedNoteIds.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Notes</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedNoteIds.length} note(s)? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDeleteConfirm}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>}
          </div>}
        
        {/* Enhanced Search */}
        {!isSelectMode && <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors" />
          </div>}
      </div>

      {/* Enhanced Notes List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading notes...
            </div>
          </div> : notes.length === 0 ? <div className="p-8 text-center space-y-4">
            <div className="bg-muted/30 rounded-full p-6 w-fit mx-auto">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">No notes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first note to get started
              </p>
              <Button onClick={onNewNote} className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </div>
          </div> : <div className="p-3 space-y-2">
            {notes.map(note => <Card key={note.id} className={cn("p-4 cursor-pointer transition-all duration-200 border group hover:shadow-md", selectedNoteId === note.id && !isSelectMode ? "bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20" : "hover:bg-muted/30 border-border/50 hover:border-border", selectedNoteIds.includes(note.id) && isSelectMode ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "")} onClick={() => onNoteSelect(note.id)}>
                <div className="flex gap-3">
                  {/* Enhanced Checkbox for select mode */}
                  {isSelectMode && <div className="flex items-center pt-1">
                      <Checkbox checked={selectedNoteIds.includes(note.id)} onClick={e => e.stopPropagation()} onChange={() => onNoteSelect(note.id)} className="border-primary/50" />
                    </div>}
                  
                  {/* Enhanced Note Icon/Thumbnail */}
                  {renderNoteIcon(note)}
                  
                  {/* Enhanced Note Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 flex-1 group-hover:text-primary/80 transition-colors">
                        {note.title || "Untitled Note"}
                      </h3>
                    </div>
                    
                    {note.content && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {note.content.length > 120 ? `${note.content.substring(0, 120)}...` : note.content}
                      </p>}
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(note.updated_at), {
                    addSuffix: true
                  })}
                      </span>
                      <div className="flex items-center gap-1">
                        {note.is_transcription && <Badge variant="secondary" className="text-xs px-2 h-5 bg-red-50 text-red-600 border-red-200">
                            <Video className="h-2 w-2 mr-1" />
                            Video
                          </Badge>}
                        {note.tags.length > 0 && <div className="flex gap-1">
                            {note.tags.slice(0, 1).map(tag => <Badge key={tag.id} variant="outline" className="text-xs px-2 h-5">
                                {tag.name}
                              </Badge>)}
                            {note.tags.length > 1 && <Badge variant="outline" className="text-xs px-2 h-5">
                                +{note.tags.length - 1}
                              </Badge>}
                          </div>}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>)}
          </div>}
      </div>
    </div>;
}