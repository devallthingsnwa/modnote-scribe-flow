
import { useState, useEffect } from "react";
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Undo, Redo, Plus, Sparkles, Type, Palette, MoreHorizontal,
  Calendar, Clock, Tag as TagIcon, Share, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateModNote, ModNote } from "@/lib/modNoteApi";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EnhancedNoteEditorProps {
  noteId: string | null;
  onNoteDeleted: () => void;
}

export function EnhancedNoteEditor({ noteId, onNoteDeleted }: EnhancedNoteEditorProps) {
  const [title, setTitle] = useState("Product Team Meeting");
  const [content, setContent] = useState("");
  const [fontFamily, setFontFamily] = useState("Sans Serif");
  const [fontSize, setFontSize] = useState("15");
  const [textColor, setTextColor] = useState("#000000");
  const [selectedText, setSelectedText] = useState("");
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Adding a third PM team led by Alex and hiring Dove Herskovits as the new APM for monitoring.", completed: false },
    { id: 2, text: "Created new maturity views including a flow chart showing maturity over time, which needs accuracy confirmation.", completed: false },
    { id: 3, text: "Updates were made to maturity page charts that managers should review.", completed: false },
    { id: 4, text: "Changed language in the handbook around customer results that managers should review.", completed: false }
  ]);
  const [tableData, setTableData] = useState([
    { teamMember: "Person Names", presence: "Yes" },
    { teamMember: "Person Names", presence: "Yes" },
    { teamMember: "Person Names", presence: "Yes" }
  ]);

  const updateNoteMutation = useUpdateModNote();
  const { toast } = useToast();

  useEffect(() => {
    if (noteId === "task-3") {
      setTitle("Product Team Meeting");
      setContent("Updates to hiring processes, maturity charts, and the company handbook.");
    }
  }, [noteId]);

  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercentage = (completedCount / checklist.length) * 100;

  if (!noteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No note selected</h3>
          <p className="text-gray-500">Select a note to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Breadcrumb */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex items-center text-sm text-gray-600">
          <span className="text-blue-600 hover:underline cursor-pointer">My Notebook</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span>{title}</span>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Insert Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Insert
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Table</DropdownMenuItem>
              <DropdownMenuItem>Checklist</DropdownMenuItem>
              <DropdownMenuItem>Image</DropdownMenuItem>
              <DropdownMenuItem>Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Undo/Redo */}
          <div className="flex">
            <Button variant="ghost" size="sm">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          {/* AI Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm">
                <Sparkles className="w-4 h-4 mr-1" />
                AI
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Summarize</DropdownMenuItem>
              <DropdownMenuItem>Improve Writing</DropdownMenuItem>
              <DropdownMenuItem>Expand Content</DropdownMenuItem>
              <DropdownMenuItem>Fix Grammar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Font Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Normal Text</span>
          
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-32 h-8">
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
              <SelectItem value="12">12pt</SelectItem>
              <SelectItem value="14">14pt</SelectItem>
              <SelectItem value="15">15pt</SelectItem>
              <SelectItem value="16">16pt</SelectItem>
              <SelectItem value="18">18pt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Color Picker */}
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
          />
          <Button variant="ghost" size="sm">
            <Palette className="w-4 h-4" />
          </Button>
        </div>

        {/* Text Formatting */}
        <div className="flex">
          <Button variant="ghost" size="sm">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex">
          <Button variant="ghost" size="sm">
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <AlignRight className="w-4 h-4" />
          </Button>
        </div>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Code Block</DropdownMenuItem>
            <DropdownMenuItem>Quote</DropdownMenuItem>
            <DropdownMenuItem>Divider</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <Button className="bg-teal-500 hover:bg-teal-600 text-white">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">0/{checklist.length}</span>
            <span className="text-sm text-gray-500">{Math.round(progressPercentage)}% complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Note Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-none px-0 mb-4 focus-visible:ring-0"
          placeholder="Note title"
        />

        {/* Note Description */}
        <p className="text-gray-700 mb-6">{content}</p>

        {/* Checklist */}
        <div className="mb-6">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-3 mb-3">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleChecklistItem(item.id)}
                className="mt-1 rounded border-gray-300"
              />
              <span className={cn("text-sm", item.completed && "line-through text-gray-500")}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* Follow up actions button */}
        <Button className="bg-purple-500 hover:bg-purple-600 text-white mb-6 w-full">
          Follow up actions
        </Button>

        {/* Create Maturity Flow Chart */}
        <div className="mb-4">
          <span className="text-blue-600 hover:underline cursor-pointer">Create Maturity Flow Chart</span>
        </div>

        {/* YouTube Video Link */}
        <div className="mb-6">
          <span className="text-blue-600 hover:underline cursor-pointer">Youtube Video</span>
        </div>

        {/* Team Table */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Team Member</th>
                  <th className="text-left py-2 font-medium">Presence</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="py-2">{row.teamMember}</td>
                    <td className="py-2">{row.presence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tags and Metadata */}
        <div className="border-t pt-4 mt-8">
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>12 Jun, 8:00</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>0/1</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <TagIcon className="w-3 h-3 mr-1" />
              Meeting
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <TagIcon className="w-3 h-3 mr-1" />
              Product
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
