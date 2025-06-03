
import { useState } from "react";
import { FileText, Calendar, User, Share, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface Note {
  id: string;
  title: string;
  preview: string;
  tags: string[];
  lastModified: string;
  author: string;
  shared: boolean;
}

export function NotesListView() {
  const [notes] = useState<Note[]>([
    {
      id: "1",
      title: "Follow up actions",
      preview: "Confirm accuracy of YE update quarterly. New chart view created by Josh. Check update to maturity...",
      tags: [],
      lastModified: "5 minutes ago",
      author: "Josh",
      shared: false
    },
    {
      id: "2", 
      title: "Things to do",
      preview: "Prepare Monthly Product Meeting Updates",
      tags: [],
      lastModified: "2 minutes ago",
      author: "Josh",
      shared: false
    },
    {
      id: "3",
      title: "Product Team Meeting",
      preview: "Updates to hiring processes, maturity charts, and the company handbook.",
      tags: [],
      lastModified: "6 minutes ago",
      author: "Josh",
      shared: false
    },
    {
      id: "4",
      title: "How to Use This Space",
      preview: "Use this space for living and other workflow Spaces are set...",
      tags: [],
      lastModified: "2 minutes ago",
      author: "Josh",
      shared: false
    },
    {
      id: "5",
      title: "Follow up actions",
      preview: "Confirm accuracy of YE update quarterly flow chart view created by...",
      tags: [],
      lastModified: "12 Jun 2020",
      author: "Josh",
      shared: false
    }
  ]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">32 Notes</h1>
        </div>
        <div className="flex items-center gap-4">
          <select className="text-sm border border-gray-300 rounded px-3 py-1">
            <option>My Notebook</option>
          </select>
          <select className="text-sm border border-gray-300 rounded px-3 py-1">
            <option>Product Team Meeting</option>
          </select>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Share
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Notes
          </Button>
          <span className="text-sm text-gray-500">Reminders</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Normal Text</span>
          <span>Sans Serif</span>
          <span>16</span>
          <Button variant="ghost" size="sm">B</Button>
          <Button variant="ghost" size="sm">I</Button>
          <Button variant="ghost" size="sm">U</Button>
          <Button variant="ghost" size="sm">More</Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">{note.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{note.preview}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {note.lastModified}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {note.author}
                  </span>
                  {note.shared && (
                    <span className="flex items-center gap-1">
                      <Share className="w-3 h-3" />
                      Shared
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
