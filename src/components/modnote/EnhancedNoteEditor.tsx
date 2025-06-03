
import { useState } from "react";
import { 
  ChevronRight, 
  Undo2, 
  Redo2, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Sparkles,
  Calendar,
  Plus,
  CheckSquare,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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

interface EnhancedNoteEditorProps {
  noteId: string | null;
  onNoteDeleted: () => void;
}

export function EnhancedNoteEditor({ noteId }: EnhancedNoteEditorProps) {
  const [title, setTitle] = useState("Product Team Meeting");
  const [content, setContent] = useState(`Updates to hiring processes, maturity charts, and the company handbook.

• Adding a third PM team led by Alex and hiring Dove Herskovits as the new APM for monitoring.

• Created new maturity views including a flow chart showing maturity over time, which needs accuracy confirmation.

• Updates were made to maturity page charts that managers should review.

• Changed language in the handbook around customer results that managers should review.`);
  const [fontSize, setFontSize] = useState("15");
  
  const progressPercentage = 0; // 0/1 completed

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a note to edit</h3>
          <p className="text-gray-500">Choose a note from the list to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Breadcrumb Navigation */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center text-sm text-gray-600">
          <span>My Notebook</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">Product Team Meeting</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Insert Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Plus className="w-4 h-4 mr-1" />
                Insert
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Bulleted List</DropdownMenuItem>
              <DropdownMenuItem>Numbered List</DropdownMenuItem>
              <DropdownMenuItem>Checkbox</DropdownMenuItem>
              <DropdownMenuItem>Table</DropdownMenuItem>
              <DropdownMenuItem>Link</DropdownMenuItem>
              <DropdownMenuItem>Image</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Undo/Redo */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Redo2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* AI Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Sparkles className="w-4 h-4 mr-1" />
                AI
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Improve Writing</DropdownMenuItem>
              <DropdownMenuItem>Summarize</DropdownMenuItem>
              <DropdownMenuItem>Make Longer</DropdownMenuItem>
              <DropdownMenuItem>Make Shorter</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Font Controls */}
          <Select value="Sans Serif">
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sans Serif">Sans Serif</SelectItem>
              <SelectItem value="Serif">Serif</SelectItem>
              <SelectItem value="Monospace">Monospace</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="18">18</SelectItem>
            </SelectContent>
          </Select>

          {/* Color Picker */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Palette className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Format Buttons */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Underline className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Alignment */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <AlignRight className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <MoreHorizontal className="w-4 h-4 mr-1" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Code Block</DropdownMenuItem>
              <DropdownMenuItem>Quote</DropdownMenuItem>
              <DropdownMenuItem>Divider</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-semibold border-none p-0 mb-6 focus-visible:ring-0 shadow-none"
            placeholder="Untitled"
            style={{ fontSize: '24px' }}
          />

          {/* Content Editor */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] border-none p-0 resize-none focus-visible:ring-0 text-base leading-relaxed shadow-none mb-6"
            style={{ fontSize: `${fontSize}px` }}
          />

          {/* Follow up actions button */}
          <div className="mb-6">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <CheckSquare className="w-4 h-4 mr-2" />
              Follow up actions
            </Button>
          </div>

          {/* Create Maturity Flow Chart */}
          <div className="mb-6">
            <div className="inline-block bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm">
              Create Maturity Flow Chart
            </div>
          </div>

          {/* YouTube Video Link */}
          <div className="mb-6">
            <a href="#" className="text-blue-600 hover:underline text-sm">
              YouTube Video
            </a>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 text-sm">Team Member</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900 text-sm">Presence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm">Person Names</td>
                  <td className="px-4 py-3 text-sm">Yes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm">Person Names</td>
                  <td className="px-4 py-3 text-sm">Yes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm">Person Names</td>
                  <td className="px-4 py-3 text-sm">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer with Metadata */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Due Date */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>12 Jun, 8:00</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2">
              <Progress value={progressPercentage} className="w-20 h-2" />
              <span className="text-sm text-gray-600">0/1</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Meeting
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Product
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
