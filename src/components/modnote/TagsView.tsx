
import { useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TagsView() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const tags = [
    { id: "1", name: "Meeting", color: "blue", count: 15 },
    { id: "2", name: "Product", color: "green", count: 8 },
    { id: "3", name: "Research", color: "purple", count: 12 },
    { id: "4", name: "Personal", color: "orange", count: 5 },
  ];

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tags</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Tag
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tags.map((tag) => (
          <div key={tag.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <Tag className={`w-5 h-5 text-${tag.color}-600`} />
              <h3 className="font-medium text-gray-900">{tag.name}</h3>
            </div>
            <p className="text-sm text-gray-500">{tag.count} notes</p>
          </div>
        ))}
      </div>
    </div>
  );
}
