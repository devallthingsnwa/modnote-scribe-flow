
import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  shared: number;
}

export function NotebooksListView() {
  const [notebooks] = useState<Notebook[]>([
    {
      id: "1",
      title: "The Cipher of Ashes",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      shared: 3
    },
    {
      id: "2",
      title: "The Dragon's Oath", 
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      shared: 3
    },
    {
      id: "3",
      title: "Whispers of the Forgotten Forest",
      space: "Example names", 
      createdBy: "Sam Lee",
      updated: "2 Jun",
      shared: 3
    },
    {
      id: "4",
      title: "Whispered Lies",
      space: "Example names",
      createdBy: "Sam Lee", 
      updated: "7 Jun",
      shared: 3
    },
    {
      id: "5",
      title: "The Art of Living Intentionally",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun", 
      shared: 3
    },
    {
      id: "6",
      title: "The Timekeeper's Dilemma",
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      shared: 3
    },
    {
      id: "7", 
      title: "The Glass City Chronicles",
      space: "Example names\nAdvertising",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      shared: 0
    },
    {
      id: "8",
      title: "Beneath the Crimson Veil", 
      space: "Example names",
      createdBy: "Sam Lee",
      updated: "2 Jun",
      shared: 0
    }
  ]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notebooks</h1>
          <p className="text-sm text-gray-500 mt-1">13 Notebooks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Notebook
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Space
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created by
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shared With
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notebooks.map((notebook) => (
              <tr key={notebook.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{notebook.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{notebook.space}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{notebook.createdBy}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{notebook.updated}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {notebook.shared > 0 ? notebook.shared : "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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

      {/* Get Started */}
      <div className="mt-8">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          Get Started
        </button>
      </div>
    </div>
  );
}
