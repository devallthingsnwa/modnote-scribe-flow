
import { useState } from "react";
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
  completedTasks?: string;
}

export function NotesListView() {
  const [notes] = useState<Note[]>([
    {
      id: "1",
      title: "Follow up actions",
      preview: "Confirm accuracy of YE update quarterly. New chart view created by Josh. Check update to maturity...",
      tags: [],
      lastModified: "20 minutes ago",
      author: "Josh",
      shared: false,
      hasChecklist: true
    },
    {
      id: "2", 
      title: "Things to do",
      preview: "Prepare Monthly Product Meeting Updates",
      tags: ["Product"],
      lastModified: "78 minutes ago",
      author: "Josh",
      shared: false,
      completedTasks: "0/1"
    },
    {
      id: "3",
      title: "Product Team Meeting",
      preview: "Updates to hiring processes, maturity charts, and the company handbook.",
      tags: ["Meeting", "Product"],
      lastModified: "1 hour ago",
      author: "Josh",
      shared: false,
      hasVideo: true
    },
    {
      id: "4",
      title: "How to Use This Space",
      preview: "Use this space for living and other workflow Spaces are set...",
      tags: ["Product"],
      lastModified: "2 hour ago",
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
                    Product Team Meeting
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Product Team Meeting</DropdownMenuItem>
                  <DropdownMenuItem>All Notes</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                Share
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-8 mb-6 border-b border-gray-200">
            <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium">
              Notes
            </button>
            <button className="pb-3 text-gray-500">
              Reminders
            </button>
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
                      <span>{note.lastModified}</span>
                      {note.completedTasks && (
                        <span className="text-blue-600">{note.completedTasks}</span>
                      )}
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
              
              {/* Note Content */}
              <div className="space-y-4">
                <p className="text-gray-700">
                  Updates to hiring processes, maturity charts, and the company handbook.
                </p>
                
                {/* Bullet Points */}
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Adding a third PM team led by Alex and hiring Dove Henriksdvs as the new APM for monitoring.</li>
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

                {/* Task Progress */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">Task Progress: 0/1</span>
                    <span className="text-blue-600">12 Jun, 8:00</span>
                  </div>
                </div>

                {/* Tags and Metadata */}
                <div className="flex items-center gap-2 mt-6 flex-wrap">
                  <span className="text-sm text-blue-600">12 Jun, 8:00</span>
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
