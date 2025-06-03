import { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar, 
  User, 
  Share, 
  MoreHorizontal, 
  Play, 
  CheckSquare, 
  Filter, 
  Grid3X3, 
  ChevronDown, 
  Bold, 
  Italic, 
  Underline, 
  Palette, 
  AlignLeft, 
  Plus,
  Undo,
  Redo,
  List,
  Table,
  Link,
  Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useModNotes, useReminderNotes, useUpdateModNote, ModNote } from "@/lib/modNoteApi";
import { formatDistanceToNow } from "date-fns";
import { ModNoteHeader } from "./ModNoteHeader";
import { useToast } from "@/hooks/use-toast";

export function NotesListView() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"notes" | "reminders">("notes");
  const [selectedNote, setSelectedNote] = useState<ModNote | null>(null);
  const [noteContent, setNoteContent] = useState("");
  
  const { data: notes, isLoading: notesLoading } = useModNotes();
  const { data: reminderNotes, isLoading: remindersLoading } = useReminderNotes();
  const updateNoteMutation = useUpdateModNote();

  const currentNotes = viewMode === "notes" ? (notes || []) : (reminderNotes || []);
  const isLoading = viewMode === "notes" ? notesLoading : remindersLoading;

  useEffect(() => {
    if (currentNotes.length > 0 && !selectedNote) {
      const noteToSelect = currentNotes.find(n => n.title === "Product Team Meeting") || currentNotes[0];
      setSelectedNote(noteToSelect);
      setNoteContent(noteToSelect.content || "");
    }
  }, [currentNotes, selectedNote]);

  const handleNoteSelect = (note: ModNote) => {
    setSelectedNote(note);
    setNoteContent(note.content || "");
  };

  const handleContentChange = (content: string) => {
    setNoteContent(content);
    
    // Auto-save after 1 second of no typing
    if (selectedNote) {
      const timeoutId = setTimeout(() => {
        updateNoteMutation.mutate({
          id: selectedNote.id,
          updates: { content }
        });
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleAIResponse = (response: string) => {
    const newContent = noteContent + "\n\n" + response;
    setNoteContent(newContent);
    
    if (selectedNote) {
      updateNoteMutation.mutate({
        id: selectedNote.id,
        updates: { content: newContent }
      });
    }
  };

  const getTaskProgress = (note: ModNote) => {
    if (note.task_progress && typeof note.task_progress === 'object') {
      const progress = note.task_progress as { completed: number; total: number };
      return `${progress.completed}/${progress.total}`;
    }
    return "0/1";
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ModNoteHeader 
        selectedNoteId={selectedNote?.id}
        selectedNoteTitle={selectedNote?.title}
        onAIResponse={handleAIResponse}
        currentNoteContent={noteContent}
      />
      
      <div className="flex h-full">
        {/* Notes List */}
        <div className="w-1/2 border-r border-gray-200">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {currentNotes.length} {viewMode === "notes" ? "Notes" : "Reminders"}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <select className="text-sm border border-gray-300 rounded px-3 py-1">
                  <option>My Notebook</option>
                </select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-sm">
                      {selectedNote?.title || "Select Note"}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {currentNotes.map((note) => (
                      <DropdownMenuItem key={note.id} onClick={() => handleNoteSelect(note)}>
                        {note.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                  Share
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 mb-6 border-b border-gray-200">
              <button 
                className={`pb-3 border-b-2 font-medium ${
                  viewMode === "notes" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500"
                }`}
                onClick={() => setViewMode("notes")}
              >
                Notes
              </button>
              <button 
                className={`pb-3 border-b-2 font-medium ${
                  viewMode === "reminders" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500"
                }`}
                onClick={() => setViewMode("reminders")}
              >
                Reminders
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {currentNotes.map((note) => (
                <div 
                  key={note.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedNote?.id === note.id ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleNoteSelect(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{note.title}</h3>
                        {note.is_transcription && <Play className="w-3 h-3 text-blue-500" />}
                        {note.is_reminder && <CheckSquare className="w-3 h-3 text-green-500" />}
                      </div>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {note.content || "No content"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
                        {note.task_progress && (
                          <span className="text-blue-600">{getTaskProgress(note)}</span>
                        )}
                        {note.due_date && (
                          <span className="text-orange-600">
                            Due: {formatDistanceToNow(new Date(note.due_date), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {currentNotes.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No {viewMode} found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note Editor */}
        <div className="w-1/2 bg-white">
          {selectedNote ? (
            <div className="p-6 h-full">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span>My Notebook</span>
                <span>&gt;</span>
                <span className="text-gray-900">{selectedNote.title}</span>
                <Button variant="ghost" size="sm" className="ml-auto">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4">
                  Share
                </Button>
              </div>

              {/* Enhanced Toolbar */}
              <div className="flex items-center gap-2 p-3 border border-gray-200 rounded mb-4 bg-gray-50">
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">Insert</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem><List className="w-4 h-4 mr-2" />Bullet List</DropdownMenuItem>
                    <DropdownMenuItem><CheckSquare className="w-4 h-4 mr-2" />Checklist</DropdownMenuItem>
                    <DropdownMenuItem><Table className="w-4 h-4 mr-2" />Table</DropdownMenuItem>
                    <DropdownMenuItem><Link className="w-4 h-4 mr-2" />Link</DropdownMenuItem>
                    <DropdownMenuItem><Image className="w-4 h-4 mr-2" />Image</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <Button variant="ghost" size="sm">
                  <Undo className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Redo className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">AI</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Summarize</DropdownMenuItem>
                    <DropdownMenuItem>Improve Writing</DropdownMenuItem>
                    <DropdownMenuItem>Generate Ideas</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <Button variant="ghost" size="sm">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Underline className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Palette className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <select className="text-sm border-0 bg-transparent">
                  <option>Normal Text</option>
                  <option>Heading 1</option>
                  <option>Heading 2</option>
                </select>
                <select className="text-sm border-0 bg-transparent">
                  <option>Sans Serif</option>
                  <option>Serif</option>
                  <option>Mono</option>
                </select>
                <select className="text-sm border-0 bg-transparent">
                  <option>15</option>
                  <option>12</option>
                  <option>14</option>
                  <option>16</option>
                  <option>18</option>
                </select>
                
                <Button variant="ghost" size="sm">
                  <AlignLeft className="w-4 h-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">More</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Highlight</DropdownMenuItem>
                    <DropdownMenuItem>Strikethrough</DropdownMenuItem>
                    <DropdownMenuItem>Code Block</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">{selectedNote.title}</h2>
                
                {/* Note Content Editor */}
                <div className="min-h-96">
                  <textarea
                    value={noteContent}
                    onChange={(e) => {
                      setNoteContent(e.target.value);
                      handleContentChange(e.target.value);
                    }}
                    className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Start writing your note..."
                  />
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 mt-6 flex-wrap">
                  <span className="text-sm text-blue-600">
                    {formatDistanceToNow(new Date(selectedNote.updated_at), { addSuffix: true })}
                  </span>
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  {selectedNote.is_transcription && (
                    <Badge className="bg-red-100 text-red-800 text-xs">Video</Badge>
                  )}
                  {selectedNote.is_reminder && (
                    <Badge className="bg-green-100 text-green-800 text-xs">Reminder</Badge>
                  )}
                  {selectedNote.task_progress && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      Tasks: {getTaskProgress(selectedNote)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a note to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
