
import { useState } from "react";
import { Calendar, Clock, Circle, MoreHorizontal, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  progress: { completed: number; total: number };
  dueDate?: string;
  tags: string[];
  isCompleted?: boolean;
  hasSubtasks?: boolean;
}

interface NotesListViewProps {
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  searchQuery: string;
}

export function NotesListView({ selectedNoteId, onNoteSelect, searchQuery }: NotesListViewProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "reminders">("notes");
  
  const mockNotes: Note[] = [
    {
      id: "note-1",
      title: "Follow up actions",
      content: "Confirm accuracy of or update maturity flow chart view created by Josh. Check updates to maturity...",
      timestamp: "20 minutes ago",
      progress: { completed: 0, total: 1 },
      hasSubtasks: true,
      tags: []
    },
    {
      id: "note-2",
      title: "Things to do",
      content: "Prepare Monthly Product Meeting Updates",
      timestamp: "59 minutes ago",
      progress: { completed: 0, total: 1 },
      hasSubtasks: true,
      tags: []
    },
    {
      id: "note-3",
      title: "Product Team Meeting",
      content: "Updates to hiring processes, maturity charts, and the company handbook.",
      timestamp: "1 hour ago",
      dueDate: "12 Jun, 8:00",
      progress: { completed: 0, total: 1 },
      tags: ["Meeting", "Product"]
    },
    {
      id: "note-4",
      title: "How to Use This Space",
      content: "How to use spaces for hiring and other workflows. Spaces are us...",
      timestamp: "3 hours ago",
      progress: { completed: 0, total: 1 },
      tags: ["Product"]
    },
    {
      id: "note-5",
      title: "Follow up actions",
      content: "Confirm accuracy of or update maturity flow chart view created by Josh. Check updates to maturity...",
      timestamp: "12 Jun, 8:00",
      isCompleted: true,
      progress: { completed: 1, total: 1 },
      tags: ["Meeting", "Product"]
    }
  ];

  const filteredNotes = mockNotes.filter(note => {
    if (activeTab === "reminders") {
      return note.dueDate || note.tags.includes("Meeting");
    }
    return !searchQuery || 
           note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           note.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          32 Notes
        </h2>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("notes")}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "notes"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "reminders"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Reminders
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredNotes.map((note) => {
          const isSelected = selectedNoteId === note.id;
          
          return (
            <div
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                isSelected
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              )}
            >
              {/* Header with Checkbox and Options */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  {note.hasSubtasks ? (
                    <Circle className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Checkbox 
                      checked={note.isCompleted}
                      className="rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    "font-medium mb-2 text-sm",
                    note.isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                  )}>
                    {note.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">
                    {note.content}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Progress Bar */}
              {note.progress && (
                <div className="mb-3 ml-6">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ 
                        width: `${(note.progress.completed / note.progress.total) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Footer */}
              <div className="flex items-center justify-between ml-6">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{note.timestamp}</span>
                  
                  {note.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{note.dueDate}</span>
                    </div>
                  )}
                </div>
                
                {note.tags.length > 0 && (
                  <div className="flex gap-1">
                    {note.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className={cn(
                          "text-xs px-2 py-0.5",
                          tag === "Meeting" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"
                        )}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
