
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
    <div className="h-screen flex flex-col bg-gray-50">
      <ModNoteHeader 
        selectedNoteId={selectedNote?.id}
        selectedNoteTitle={selectedNote?.title}
        onAIResponse={handleAIResponse}
        currentNoteContent={noteContent}
      />
      
      <div className="flex h-full">
        {/* Notes List */}
        <div className="w-96 border-r border-gray-200 bg-white">
          <div className="p-4">
            {/* Header with count and controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-medium text-blue-600">{currentNotes.length}</span>
                <span className="text-lg font-medium text-gray-900">
                  {viewMode === "notes" ? "Notes" : "Reminders"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notebook selector and action buttons */}
            <div className="flex items-center justify-between mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-sm h-8">
                    📓 My Notebook
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>My Notebook</DropdownMenuItem>
                  <DropdownMenuItem>Work Notes</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-sm h-8">
                    📝 Product Team Meeting
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
              
              <Button className="bg-teal-500 hover:bg-teal-600 text-white h-8 text-sm">
                Share
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 mb-4 border-b border-gray-200">
              <button 
                className={`pb-2 border-b-2 font-medium text-sm ${
                  viewMode === "notes" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setViewMode("notes")}
              >
                Notes
              </button>
              <button 
                className={`pb-2 border-b-2 font-medium text-sm ${
                  viewMode === "reminders" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setViewMode("reminders")}
              >
                Reminders
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {currentNotes.map((note) => (
                <div 
                  key={note.id} 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedNote?.id === note.id ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleNoteSelect(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 text-sm">{note.title}</h3>
                        {note.is_transcription && <Play className="w-3 h-3 text-blue-500" />}
                        {note.is_reminder && <CheckSquare className="w-3 h-3 text-green-500" />}
                      </div>
                      <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                        {note.content || "No content"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
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
        <div className="flex-1 bg-white">
          {selectedNote ? (
            <div className="p-6 h-full flex flex-col">
              {/* Breadcrumb and actions */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <span>📓 My Notebook</span>
                <span>&gt;</span>
                <span className="text-gray-900">📝 {selectedNote.title}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white text-sm px-4 h-8">
                    Share
                  </Button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 p-3 border border-gray-200 rounded mb-6 bg-gray-50 flex-wrap">
                <Button variant="ghost" size="sm" className="h-8">
                  <Plus className="w-4 h-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">Insert</Button>
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
                
                <Button variant="ghost" size="sm" className="h-8">
                  <Undo className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8">
                  <Redo className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">AI</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Summarize</DropdownMenuItem>
                    <DropdownMenuItem>Improve Writing</DropdownMenuItem>
                    <DropdownMenuItem>Generate Ideas</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <Button variant="ghost" size="sm" className="h-8">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8">
                  <Underline className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8">
                  <Palette className="w-4 h-4" />
                </Button>
                
                <div className="w-px h-6 bg-gray-300"></div>
                
                <select className="text-sm border-0 bg-transparent h-8">
                  <option>Normal Text</option>
                  <option>Heading 1</option>
                  <option>Heading 2</option>
                </select>
                <select className="text-sm border-0 bg-transparent h-8">
                  <option>Sans Serif</option>
                  <option>Serif</option>
                  <option>Mono</option>
                </select>
                <select className="text-sm border-0 bg-transparent h-8">
                  <option>15</option>
                  <option>12</option>
                  <option>14</option>
                  <option>16</option>
                  <option>18</option>
                </select>
                
                <Button variant="ghost" size="sm" className="h-8">
                  <AlignLeft className="w-4 h-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">More</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Highlight</DropdownMenuItem>
                    <DropdownMenuItem>Strikethrough</DropdownMenuItem>
                    <DropdownMenuItem>Code Block</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Note Content */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-4">{selectedNote.title}</h2>
                
                <div className="flex-1">
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
