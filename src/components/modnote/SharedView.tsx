
import { Share2, User } from "lucide-react";

export function SharedView() {
  const sharedNotes = [
    { id: "1", title: "Project Roadmap", sharedBy: "Alex Johnson", date: "2 days ago" },
    { id: "2", title: "Team Updates", sharedBy: "Sarah Davis", date: "1 week ago" },
  ];

  return (
    <div className="flex-1 p-6 bg-white">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Shared With Me</h1>
      
      <div className="space-y-4">
        {sharedNotes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{note.title}</h3>
                <p className="text-sm text-gray-500">Shared by {note.sharedBy} • {note.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
