
import { useState } from "react";
import { Plus, MoreHorizontal, ChevronRight, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Notebook {
  id: string;
  title: string;
  space: string;
  createdBy: string;
  updated: string;
  sharedWith: number;
  isExpanded?: boolean;
}

export function NotebooksView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [notebooks, setNotebooks] = useState<Notebook[]>([
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
      space: "Mobbin.org",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      sharedWith: 3
    },
    {
      id: "8",
      title: "Beneath the Crimson Veil",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "-",
      sharedWith: 3
    }
  ]);

  const toggleNotebook = (id: string) => {
    setNotebooks(prev => prev.map(notebook => 
      notebook.id === id ? { ...notebook, isExpanded: !notebook.isExpanded } : notebook
    ));
  };

  const filteredNotebooks = notebooks.filter(notebook =>
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notebook.space.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notebooks</h1>
        <div className="flex items-center gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Notebook
          </Button>
        </div>
      </div>

      {/* Sub-header with count and search */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-gray-600">13 Notebooks</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Find notebooks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Space</div>
            <div className="col-span-2">Created by</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1">Shared With</div>
            <div className="col-span-1">Actions</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {filteredNotebooks.map((notebook) => (
            <div key={notebook.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="grid grid-cols-12 gap-4 items-center text-sm">
                {/* Title with expand/collapse */}
                <div className="col-span-4 flex items-center gap-2">
                  <button
                    onClick={() => toggleNotebook(notebook.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {notebook.isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <span className="font-medium text-gray-900">{notebook.title}</span>
                </div>

                {/* Space */}
                <div className="col-span-2 text-gray-600">
                  {notebook.space}
                </div>

                {/* Created by */}
                <div className="col-span-2 text-gray-600">
                  {notebook.createdBy}
                </div>

                {/* Updated */}
                <div className="col-span-2 text-gray-600">
                  {notebook.updated}
                </div>

                {/* Shared With */}
                <div className="col-span-1">
                  {notebook.sharedWith > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {notebook.sharedWith}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Expanded content */}
              {notebook.isExpanded && (
                <div className="mt-3 ml-6 pl-4 border-l-2 border-gray-200">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• Sample note 1</div>
                    <div>• Sample note 2</div>
                    <div>• Sample note 3</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
