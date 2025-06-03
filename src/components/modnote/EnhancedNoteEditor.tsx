
import { useState, useEffect } from "react";
import { useModNote, useUpdateModNote } from "@/lib/modNoteApi";
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
  ChevronDown,
  ChevronRight,
  Bookmark,
  Share2,
  Grid3X3,
  Filter,
  RotateCcw,
  Calendar,
  NotebookPen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EnhancedNoteEditorProps {
  noteId: string | null;
  onNoteDeleted: () => void;
}

export function EnhancedNoteEditor({ noteId, onNoteDeleted }: EnhancedNoteEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  
  const { data: note, isLoading } = useModNote(noteId || "");
  const updateNoteMutation = useUpdateModNote();

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
    }
  }, [note]);

  const handleSave = async () => {
    if (!noteId) return;
    
    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        updates: { title, content }
      });
      
      toast({
        title: "Note saved",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error saving note",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
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

  if (isLoading) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col">
      {/* Top Navigation Bar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          {/* Left Section - Navigation and Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-gray-400" />
              <Filter className="w-4 h-4 text-gray-400" />
              <List className="w-4 h-4 text-gray-400" />
              <RotateCcw className="w-4 h-4 text-gray-400" />
            </div>
            
            {/* Breadcrumb */}
            <div className="flex items-center text-sm text-gray-600">
              <NotebookPen className="w-4 h-4 mr-1" />
              <span>My Notebook</span>
              <ChevronRight className="w-4 h-4 mx-2" />
              <span className="text-blue-600">Product Team Meeting</span>
            </div>
          </div>

          {/* Right Section - Share and More */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1">
          {/* Insert Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm gap-1">
                Insert
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Table</DropdownMenuItem>
              <DropdownMenuItem>Image</DropdownMenuItem>
              <DropdownMenuItem>Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Undo/Redo */}
          <Button variant="ghost" size="sm">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Redo2 className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* AI Button */}
          <Button variant="ghost" size="sm" className="text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 px-3">
            AI
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Text Style Dropdown */}
          <select className="text-sm border border-gray-200 rounded px-3 py-1 bg-white">
            <option>Normal Text</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option>Heading 3</option>
          </select>
          
          {/* Font Family */}
          <select className="text-sm border border-gray-200 rounded px-3 py-1 ml-2 bg-white">
            <option>Sans Serif</option>
            <option>Serif</option>
            <option>Monospace</option>
          </select>
          
          {/* Font Size */}
          <select className="text-sm border border-gray-200 rounded px-2 py-1 ml-2 bg-white">
            <option>15</option>
            <option>12</option>
            <option>14</option>
            <option>16</option>
            <option>18</option>
            <option>20</option>
          </select>
          
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
          
          {/* Text Color */}
          <Button variant="ghost" size="sm">
            <div className="w-4 h-4 border-b-2 border-red-500">A</div>
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* More Button */}
          <Button variant="ghost" size="sm" className="gap-1">
            More
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white rounded-lg p-8 shadow-sm">
          {/* Note Title */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Product Team Meeting
          </h1>

          {/* Content */}
          <div className="space-y-6">
            <p className="text-gray-700 leading-relaxed">
              Updates to hiring processes, maturity charts, and the company handbook.
            </p>
            
            {/* Bullet Points */}
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                <span>Adding a third PM team led by Alex and hiring Dove Herschovits as the new APM for monitoring.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                <span>Created new maturity views including a flow chart showing maturity over time, which needs accuracy confirmation.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                <span>Updates were made to maturity page charts that managers should review.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-2">•</span>
                <span>Changed language in the handbook around customer results that managers should review.</span>
              </li>
            </ul>

            {/* Follow up actions Card */}
            <Card className="p-4 bg-purple-50 border-purple-200">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-sm mb-3">
                Follow up actions
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-4 h-4 border border-gray-400 rounded"></div>
                <span>Create Maturity Flow Chart</span>
              </div>
            </Card>

            {/* YouTube Video Placeholder */}
            <div className="my-6">
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Youtube Video</p>
              </div>
            </div>

            {/* Team Member Table */}
            <div className="mt-6">
              <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="border border-gray-300 px-4 py-3 text-left font-medium text-gray-800">Team Member</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-medium text-gray-800">Presence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Person Names</td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Yes</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Person Names</td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Yes</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Person Names</td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer with Date and Tags */}
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>12 Jun, 8:00</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                  Meeting
                </Badge>
                <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                  Product
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
