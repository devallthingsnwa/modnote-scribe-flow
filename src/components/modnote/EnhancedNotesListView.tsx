
import { Calendar, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  // Filter notes based on active tab
  const displayNotes = activeTab === "notes" 
    ? notes.filter(note => !note.is_reminder) 
    : notes.filter(note => note.is_reminder || note.due_date || note.reminder_date);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Count */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {notesCount} Notes
        </h2>
        
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
          {displayNotes.length > 0 ? (
            displayNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const hasProgress = note.task_progress && typeof note.task_progress === 'object' && 
                                'completed' in note.task_progress && 'total' in note.task_progress;
              const progressData = hasProgress ? note.task_progress as { completed: number, total: number } : null;
              
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
                  {/* Note Header with Checkbox and Indicator */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      {progressData && progressData.total > 1 ? (
                        <Circle className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Checkbox 
                          checked={progressData?.completed === progressData?.total && progressData?.total > 0}
                          className="rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-medium mb-2 text-sm",
                        progressData?.completed === progressData?.total && progressData?.total > 0 
                          ? "text-gray-500 line-through" : "text-gray-900"
                      )}>
                        {note.title}
                      </h3>
                      {note.content && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-3">
                          {note.content.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar for Tasks */}
                  {progressData && progressData.total > 0 && (
                    <div className="mb-3 ml-6">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ 
                            width: `${(progressData.completed / progressData.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Footer with Time and Due Date */}
                  <div className="flex items-center justify-between ml-6">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(note.updated_at)}</span>
                      
                      {/* Due Date */}
                      {note.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(note.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Badges */}
                    <div className="flex gap-1">
                      {note.is_reminder && (
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Reminder
                        </Badge>
                      )}
                      {note.is_transcription && (
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-200"
                        >
                          Transcript
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No {activeTab} found</p>
              <p className="text-sm">Create your first {activeTab === "notes" ? "note" : "reminder"} to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
