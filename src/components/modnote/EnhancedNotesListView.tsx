
import { Calendar, Clock, Circle, Grid3X3, Filter, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModNote } from "@/lib/modNoteApi";
import { Checkbox } from "@/components/ui/checkbox";

interface EnhancedNotesListViewProps {
  notes: ModNote[];
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  activeTab: "notes" | "reminders";
  onTabChange: (tab: "notes" | "reminders") => void;
  notesCount: number;
}

export function EnhancedNotesListView({ 
  notes, 
  selectedNoteId, 
  onNoteSelect, 
  activeTab, 
  onTabChange,
  notesCount 
}: EnhancedNotesListViewProps) {
  // Task-based notes for the Notes tab
  const taskNotes = [
    {
      id: "task-1",
      title: "Follow up actions",
      description: "Confirm accuracy of or update maturity flow chart view created by Josh. Check updates to maturity...",
      time: "30 minutes ago",
      isCompleted: false,
      hasSubtasks: true,
      progress: { completed: 0, total: 1 },
      indicator: "blue"
    },
    {
      id: "task-2", 
      title: "Things to do",
      description: "Prepare Monthly Product Meeting Updates",
      time: "45 minutes ago",
      isCompleted: false,
      hasSubtasks: true,
      progress: { completed: 0, total: 1 },
      indicator: "blue"
    },
    {
      id: "task-3",
      title: "Product Team Meeting", 
      description: "Updates to hiring processes, maturity charts, and the company handbook.",
      time: "1 hour ago",
      dueDate: "12 Jun, 8:00",
      isCompleted: false,
      hasSubtasks: false,
      tags: ["Meeting", "Product"],
      progress: { completed: 0, total: 1 },
      indicator: "blue"
    },
    {
      id: "task-4",
      title: "How to Use This Space",
      description: "How to use spaces for hiring and other workflows. Spaces are us...",
      time: "3 days ago", 
      category: "Product",
      isCompleted: false,
      hasSubtasks: false
    },
    {
      id: "task-5",
      title: "Follow up actions",
      description: "Confirm accuracy of or update maturity flow chart view created by Josh. Check updates to maturity...", 
      time: "12 Jun, 8:00",
      isCompleted: true,
      hasSubtasks: false,
      tags: ["Meeting", "Product"],
      indicator: "blue"
    }
  ];

  const displayNotes = activeTab === "notes" ? taskNotes : notes;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Icons and Count */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          {/* Left side - Icons and Notes count */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                <Grid3X3 className="w-4 h-4 text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                <Filter className="w-4 h-4 text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                <List className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {notesCount} Notes
            </h2>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => onTabChange("notes")}
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
            onClick={() => onTabChange("reminders")}
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
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          {activeTab === "notes" ? (
            // Task-based Notes View
            taskNotes.map((note) => {
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
                  {/* Task Header with Checkbox and Indicator */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center gap-2 mt-0.5">
                      {note.indicator && (
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      )}
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
                        {note.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar for Subtasks */}
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
                  
                  {/* Footer with Time, Due Date, and Tags */}
                  <div className="flex items-center justify-between ml-6">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{note.time}</span>
                      
                      {/* Due Date */}
                      {note.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{note.dueDate}</span>
                        </div>
                      )}
                      
                      {/* Category */}
                      {note.category && (
                        <span className="text-blue-600">{note.category}</span>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {note.tags && (
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
            })
          ) : (
            // Reminders View (existing implementation)
            notes.map((note) => {
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
                  <h3 className="font-medium text-gray-900 mb-2">
                    {note.title}
                  </h3>
                  
                  {note.content && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {note.content.substring(0, 100)}...
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Recently updated</span>
                    </div>
                    
                    {note.is_reminder && (
                      <Badge variant="outline" className="text-xs">
                        Reminder
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
