import { useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filteredNotebooks = notebooks.filter(notebook =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notebook.space.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notebooks</h1>
          <p className="text-gray-500 text-sm">{filteredNotebooks.length} Notebooks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Notebook
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

      {/* Content */}
      {viewMode === "list" ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNotebooks.map((notebook) => (
            <div key={notebook.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <div className="w-5 h-5 bg-blue-600 rounded"></div>
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
              <h3 className="font-medium text-gray-900 mb-2">{notebook.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{notebook.space}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>By {notebook.createdBy}</span>
                <span>{notebook.updated}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Badge variant="outline" className="text-xs">
                  {notebook.sharedWith} shared
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredNotebooks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No notebooks found</div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create your first notebook
          </Button>
        </div>
      )}
    </div>
  );
}
