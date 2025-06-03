
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrashView() {
  const trashedNotes = [
    { id: "1", title: "Old Meeting Notes", deletedAt: "2 days ago" },
    { id: "2", title: "Draft Ideas", deletedAt: "1 week ago" },
  ];

  return (
    <div className="flex-1 p-6 bg-white">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Trash</h1>
      
      <div className="space-y-4">
        {trashedNotes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-gray-900">{note.title}</h3>
                  <p className="text-sm text-gray-500">Deleted {note.deletedAt}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </Button>
                <Button variant="destructive" size="sm">
                  Delete Forever
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
