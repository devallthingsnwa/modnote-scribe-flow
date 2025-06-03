
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  CheckSquare, 
  Table, 
  Undo2, 
  Redo2, 
  Type, 
  Palette,
  MoreHorizontal,
  Play,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoteEditorProps {
  noteId: string | null;
  onNoteCreated?: (noteId: string) => void;
}

export function NoteEditor({ noteId, onNoteCreated }: NoteEditorProps) {
  const [title, setTitle] = useState("Product Team Meeting");
  const [content, setContent] = useState("");

  if (!noteId) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">Select a note to edit</div>
          <p className="text-sm">Choose a note from the list to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col">
      {/* Breadcrumb */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center text-sm text-gray-600">
          <span>My Notebook</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-blue-600">Product Team Meeting</span>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1">
          {/* Insert Dropdown */}
          <Button variant="ghost" size="sm" className="text-sm">
            Insert
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Undo/Redo */}
          <Button variant="ghost" size="sm">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Redo2 className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* AI Tools */}
          <Button variant="ghost" size="sm" className="text-sm bg-purple-50 text-purple-700 hover:bg-purple-100">
            AI
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Font Controls */}
          <Select defaultValue="normal">
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal Text</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="sans">
            <SelectTrigger className="w-28 h-8 text-sm ml-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sans">Sans Serif</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="15">
            <SelectTrigger className="w-16 h-8 text-sm ml-2">
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
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Text Formatting */}
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
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* More Options */}
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
            <span className="ml-1 text-sm">More</span>
          </Button>
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-semibold border-none p-0 mb-6 bg-transparent focus:ring-0 focus:border-none"
            placeholder="Note title..."
          />

          {/* Content */}
          <div className="space-y-4">
            {/* Example Follow Up Actions Button */}
            <Card className="p-4 bg-purple-50 border-purple-200">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                Follow up actions
              </Button>
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-4 h-4 border border-gray-400 rounded"></div>
                  <span>Create Maturity Flow Chart</span>
                </div>
              </div>
            </Card>

            {/* Main Content Area */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Updates to hiring processes, maturity charts, and the company handbook.</h3>
              
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Adding a third PM team led by Alex and hiring Dove Herschovits as the new APM for monitoring.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Created new maturity views including a flow chart showing maturity over time, which needs accuracy confirmation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Updates were made to maturity page charts that managers should review.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Changed language in the handbook around customer results that managers should review.</span>
                </li>
              </ul>

              {/* YouTube Video Placeholder */}
              <div className="my-6">
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">YouTube Video</p>
                </div>
              </div>

              {/* Table */}
              <div className="mt-6">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-medium">Team Member</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-medium">Presence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Person Names</td>
                      <td className="border border-gray-300 px-4 py-2">Yes</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Person Names</td>
                      <td className="border border-gray-300 px-4 py-2">Yes</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">Person Names</td>
                      <td className="border border-gray-300 px-4 py-2">Yes</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tags and Metadata */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>12 Jun, 8:00</span>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Meeting</Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Product</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
