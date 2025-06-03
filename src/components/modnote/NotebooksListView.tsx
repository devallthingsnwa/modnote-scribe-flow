import { useState } from "react";
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  ChevronLeft, 
  Undo, 
  Redo, 
  Bold, 
  Italic, 
  Underline,
  Type,
  Palette,
  Highlighter,
  Users,
  Share2,
  Eye,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ShareModal } from "./ShareModal";
import { useCreateNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Notebook {
  id: string;
  title: string;
  space: string;
  createdBy: string;
  updated: string;
  sharedWith: number;
}

export function NotebooksListView() {
  const [notebooks] = useState<Notebook[]>([
    {
      id: "1",
      title: "The Cipher of Ashes",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "2", 
      title: "The Dragon's Oath",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "3",
      title: "Whispers of the Forgotten Forest",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "4",
      title: "Whispered Lies",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "5",
      title: "The Art of Living Intentionally",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "6",
      title: "The Timekeeper's Dilemma",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "7",
      title: "The Glass City Chronicles",
      space: "Example names Methodology",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "8",
      title: "Beneath the Crimson Veil",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  
  const createNoteMutation = useCreateNote();
  const { toast } = useToast();
  const navigate = useNavigate();

  const filteredNotebooks = notebooks.filter(notebook =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notebook.space.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewNote = () => {
    setIsCreatingNote(true);
    createNoteMutation.mutate({
      note: {
        title: "Untitled Note",
        content: ""
      },
      tagIds: []
    }, {
      onSuccess: (newNote) => {
        toast({
          title: "Note created",
          description: "Your new note has been created successfully."
        });
        // Navigate to the new note page for editing
        navigate(`/note/${newNote.id}`);
      },
      onError: (error) => {
        toast({
          title: "Error creating note",
          description: "There was an error creating your note. Please try again.",
          variant: "destructive"
        });
        console.error("Create note error:", error);
      },
      onSettled: () => {
        setIsCreatingNote(false);
      }
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        {/* Breadcrumb Navigation */}
        <div className="mb-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  href="#" 
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
                >
                  <ChevronLeft className="w-3 h-3" />
                  My Notebook
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-900 font-medium text-sm">
                  Product Team Meeting
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Editor Toolbar */}
        <div className="flex items-center justify-between">
          {/* Left Section - Editing Tools */}
          <div className="flex items-center gap-2">
            {/* Insert Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  <Plus className="w-4 h-4 mr-1" />
                  Insert
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Text Block</DropdownMenuItem>
                <DropdownMenuItem>List</DropdownMenuItem>
                <DropdownMenuItem>Image</DropdownMenuItem>
                <DropdownMenuItem>Table</DropdownMenuItem>
                <DropdownMenuItem>Checkbox</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Undo/Redo */}
            <div className="flex items-center border-l border-gray-200 pl-2 ml-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Undo className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            {/* AI Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 hover:from-purple-600 hover:to-blue-600"
            >
              AI
            </Button>

            {/* Format Controls */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 ml-2">
              {/* Font Style */}
              <Select defaultValue="normal">
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Text</SelectItem>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="h3">Heading 3</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                </SelectContent>
              </Select>

              {/* Font Family */}
              <Select defaultValue="sans">
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Sans Serif</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                </SelectContent>
              </Select>

              {/* Font Size */}
              <Select defaultValue="15">
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="14">14</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="18">18</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Formatting */}
            <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Type className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Highlighter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Italic className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Underline className="w-4 h-4" />
              </Button>
            </div>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Bullet List</DropdownMenuItem>
                <DropdownMenuItem>Numbered List</DropdownMenuItem>
                <DropdownMenuItem>Align Left</DropdownMenuItem>
                <DropdownMenuItem>Align Center</DropdownMenuItem>
                <DropdownMenuItem>Align Right</DropdownMenuItem>
                <DropdownMenuItem>Insert Link</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Section - Collaboration & Sharing */}
          <div className="flex items-center gap-2">
            {/* Collaborators */}
            <Button variant="ghost" size="sm" className="h-8 px-3">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-xs">2</span>
            </Button>

            {/* Share Button */}
            <Button 
              onClick={() => setShareModalOpen(true)}
              className="h-8 px-4 bg-green-500 hover:bg-green-600 text-white text-xs"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Duplicate Note</DropdownMenuItem>
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as Markdown</DropdownMenuItem>
                <DropdownMenuItem>Version History</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Delete Note</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notebooks</h1>
            <p className="text-gray-500 text-sm">{filteredNotebooks.length} Notebooks</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleNewNote}
              disabled={isCreatingNote}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreatingNote ? "Creating..." : "New Notebook"}
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Find Notebooks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
          </div>
        </div>

        {/* Content - Always show list view */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-900">
                  Title
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-900">
                  Space
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-900">
                  Created by
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-900">
                  Updated
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-900">
                  Shared With
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredNotebooks.map((notebook) => (
                <tr key={notebook.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded"></div>
                      </div>
                      <span className="font-medium text-gray-900">{notebook.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {notebook.space}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {notebook.createdBy}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {notebook.updated}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-xs">
                      {notebook.sharedWith}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredNotebooks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No notebooks found</div>
            <Button 
              onClick={handleNewNote}
              disabled={isCreatingNote}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreatingNote ? "Creating..." : "Create your first notebook"}
            </Button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        noteId="product-team-meeting"
        noteTitle="Product Team Meeting"
      />
    </div>
  );
}
