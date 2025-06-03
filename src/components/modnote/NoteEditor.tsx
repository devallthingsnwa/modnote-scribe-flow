
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  ChevronRight,
  ChevronDown,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  noteId: string | null;
  onNoteCreated?: (noteId: string) => void;
}

export function NoteEditor({ noteId, onNoteCreated }: NoteEditorProps) {
  const [title, setTitle] = useState("Product Team Meeting");
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(true);

  const insertFormatting = (format: string) => {
    const textarea = document.querySelector('#note-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let replacement = "";
    
    switch (format) {
      case "bold":
        replacement = `**${selectedText}**`;
        break;
      case "italic":
        replacement = `*${selectedText}*`;
        break;
      case "underline":
        replacement = `<u>${selectedText}</u>`;
        break;
      case "list":
        replacement = selectedText.split('\n').map(line => line.trim() ? `• ${line}` : line).join('\n');
        break;
      case "checklist":
        replacement = selectedText.split('\n').map(line => line.trim() ? `☐ ${line}` : line).join('\n');
        break;
    }
    
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <span>My Notebook</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-blue-600">Product Team Meeting</span>
          </div>
          <Button variant="outline" className="text-blue-600">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
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
          <select className="text-sm border border-gray-200 rounded px-2 py-1">
            <option>Normal Text</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
          </select>
          
          <select className="text-sm border border-gray-200 rounded px-2 py-1 ml-2">
            <option>Sans Serif</option>
            <option>Serif</option>
            <option>Monospace</option>
          </select>
          
          <select className="text-sm border border-gray-200 rounded px-2 py-1 ml-2">
            <option>15</option>
            <option>12</option>
            <option>14</option>
            <option>16</option>
            <option>18</option>
          </select>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Text Formatting */}
          <Button variant="ghost" size="sm" onClick={() => insertFormatting("bold")}>
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertFormatting("italic")}>
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertFormatting("underline")}>
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
            {/* Follow Up Actions Button */}
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

            {/* Main Content */}
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

              {/* Team Member Table */}
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
