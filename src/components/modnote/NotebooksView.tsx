
import { useState } from "react";
import { Plus, Search, List, Grid3X3, MoreHorizontal, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notebook {
  id: string;
  title: string;
  space: string;
  createdBy: string;
  updated: string;
  sharedWith: number;
}

export function NotebooksView() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const notebooks: Notebook[] = [
    { id: "1", title: "The Cipher of Ashes", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "2", title: "The Dragon's Oath", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "3", title: "Whispers of the Forgotten Forest", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "4", title: "Whispered Lies", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "5", title: "The Art of Living Intentionally", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "6", title: "The Timekeeper's Dilemma", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "7", title: "The Glass City Chronicles", space: "Example names Methodology", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 },
    { id: "8", title: "Beneath the Crimson Veil", space: "Example names", createdBy: "Sam Lee", updated: "2 Jun", sharedWith: 3 }
  ];

  const filteredNotebooks = notebooks.filter(notebook =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notebook.space.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notebooks</h1>
          <p className="text-gray-500 text-sm">{notebooks.length} Notebooks</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Notebook
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <List className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
          
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

      {/* Notebooks Table */}
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
              <tr key={notebook.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
