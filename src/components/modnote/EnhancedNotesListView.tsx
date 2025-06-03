
import { Calendar, CheckSquare, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ModNote } from "@/lib/modNoteApi";
import { formatDistanceToNow } from "date-fns";
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
  // Mock data for task-based notes (in real app, this would come from your API)
  const taskNotes = [
    {
      id: "1",
      title: "Follow up actions",
      description: "Confirm accuracy of or update maturity flow chart view created by Josh. Check updates to maturity...",
      time: "30 minutes ago",
      isCompleted: false,
      hasSubtasks: true,
      progress: { completed: 0, total: 1 }
    },
    {
      id: "2", 
      title: "Things to do",
      description: "Prepare Monthly Product Meeting Updates",
      time: "45 minutes ago",
      isCompleted: false,
      hasSubtasks: true,
      progress: { completed: 0, total: 1 }
    },
    {
      id: "3",
      title: "Product Team Meeting", 
      description: "Updates to hiring processes, maturity charts, and the company handbook.",
      time: "1 hour ago",
      dueDate: "12 Jun, 8:00",
      isCompleted: false,
      hasSubtasks: false,
      tags: ["Meeting", "Product"],
      progress: { completed: 0, total: 1 }
    },
    {
      id: "4",
      title: "How to Use This Space",
      description: "How to use spaces for hiring and other workflows. Spaces are us...",
      time: "3 days ago", 
      category: "Product",
      isCompleted: false,
      hasSubtasks: false
    },
    {
      id: "5",
      title: "Follow up actions",
      description: "Confirm accuracy of or update maturity flow chart view created by Josh. Check updates to maturity...", 
      time: "12 Jun, 8:00",
      isCompleted: true,
      hasSubtasks: false,
      tags: ["Meeting", "Product"]
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header with Count and Tabs */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {activeTab === "notes" ? taskNotes.length : notesCount} {activeTab === "notes" ? "Notes" : "Notes"}
        </h2>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => onTabChange("notes")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
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
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
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
        <div className="p-4 space-y-3">
          {activeTab === "notes" ? (
            // Task-based Notes View
            taskNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              
              return (
                <div
                  key={note.id}
                  onClick={() => onNoteSelect(note.id)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {/* Task Header with Checkbox */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="mt-1">
                      {note.hasSubtasks ? (
                        <Circle className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Checkbox 
                          checked={note.isCompleted}
                          className="rounded-full"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-medium mb-1",
                        note.isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                      )}>
                        {note.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {note.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar for Subtasks */}
                  {note.progress && (
                    <div className="mb-3 ml-7">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {note.progress.completed}/{note.progress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all"
                          style={{ 
                            width: `${(note.progress.completed / note.progress.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Footer with Time, Due Date, and Tags */}
                  <div className="flex items-center justify-between ml-7">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{note.time}</span>
                      
                      {/* Due Date */}
                      {note.dueDate && (
                        <>
                          <Calendar className="w-3 h-3 ml-2" />
                          <span>{note.dueDate}</span>
                        </>
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
                              "text-xs",
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
            // Original Reminders View
            notes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const taskProgress = note.task_progress || { completed: 0, total: 0 };
              
              return (
                <div
                  key={note.id}
                  onClick={() => onNoteSelect(note.id)}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {/* Note Title */}
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {note.title}
                  </h3>
                  
                  {/* Note Content Preview */}
                  {note.content && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {note.content.substring(0, 100)}...
                    </p>
                  )}
                  
                  {/* Progress Bar for Tasks */}
                  {taskProgress.total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {taskProgress.completed}/{taskProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all"
                          style={{ 
                            width: `${(taskProgress.completed / taskProgress.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Footer with Time, Due Date, and Tags */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                      </span>
                      
                      {/* Due Date */}
                      {note.due_date && (
                        <>
                          <Calendar className="w-3 h-3 ml-2" />
                          <span>
                            {new Date(note.due_date).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Tags */}
                    <div className="flex gap-1">
                      {note.is_transcription && (
                        <Badge variant="secondary" className="text-xs">
                          Video
                        </Badge>
                      )}
                      {note.is_reminder && (
                        <Badge variant="outline" className="text-xs">
                          Meeting
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {((activeTab === "notes" && taskNotes.length === 0) || (activeTab === "reminders" && notes.length === 0)) && (
            <div className="text-center py-12">
              <CheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab} yet
              </h3>
              <p className="text-gray-500">
                Create your first {activeTab === "notes" ? "note" : "reminder"} to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
