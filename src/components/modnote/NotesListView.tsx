
import { useState } from "react";
import { FileText, Calendar, User, Share, MoreHorizontal, Play, CheckSquare } from "lucide-react";
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
  hasVideo?: boolean;
  hasChecklist?: boolean;
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
      shared: false,
      hasChecklist: true
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
      tags: ["Meeting", "Product"],
      lastModified: "6 minutes ago",
      author: "Josh",
      shared: false,
      hasVideo: true
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

  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[2]); // Product Team Meeting selected

  return (
    <div className="flex h-full">
      {/* Notes List */}
      <div className="w-1/2 border-r border-gray-200">
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
              <Button variant="ghost" size="sm" className="text-blue-600">
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
              <div 
                key={note.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedNote?.id === note.id ? 'bg-blue-50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900">{note.title}</h3>
                      {note.hasVideo && <Play className="w-3 h-3 text-blue-500" />}
                      {note.hasChecklist && <CheckSquare className="w-3 h-3 text-green-500" />}
                    </div>
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
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
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
      </div>

      {/* Note Editor */}
      <div className="w-1/2 bg-white">
        {selectedNote ? (
          <div className="p-6 h-full">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">{selectedNote.title}</h2>
              
              {/* Note Content */}
              <div className="space-y-4">
                <p className="text-gray-700">
                  Updates to hiring processes, maturity charts, and the company handbook.
                </p>
                
                {/* Bullet Points */}
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Adding a third PM team lead by Alex and hiring Dove Henriksdvs as the new APM for monitoring.</li>
                  <li>Created new maturity views including a flow chart showing maturity over time, which needs accuracy confirmation.</li>
                  <li>Updates were made to maturity page charts that managers should review.</li>
                  <li>Changed language in the handbook around customer results that managers should review.</li>
                </ul>

                {/* Follow up Actions Button */}
                <div className="my-6">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                    Follow up actions
                  </Button>
                </div>

                {/* AI Generated Section */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">Create Maturity Flow Chart</h3>
                  <p className="text-purple-700 text-sm mb-3">YouTube Video</p>
                </div>

                {/* Team Member Table */}
                <div className="mt-6">
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">Team Member</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-900">Presence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="p-3 text-sm">Person Names</td>
                        <td className="p-3 text-sm">Yes</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm">Person Names</td>
                        <td className="p-3 text-sm">Yes</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-sm">Person Names</td>
                        <td className="p-3 text-sm">Yes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 mt-6">
                  <span className="text-sm text-blue-600">12 Jan, 6:00</span>
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">Meeting</Badge>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">Product</Badge>
                </div>
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
  );
}
