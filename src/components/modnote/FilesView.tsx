
import { useState } from "react";
import { Upload, Search, Grid3X3, List, MoreHorizontal, File, Image, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function FilesView() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const files = [
    { id: "1", name: "Meeting Recording.mp4", type: "video", size: "25.4 MB", uploaded: "2 hours ago" },
    { id: "2", name: "Product Mockup.png", type: "image", size: "2.1 MB", uploaded: "1 day ago" },
    { id: "3", name: "Requirements.pdf", type: "document", size: "856 KB", uploaded: "3 days ago" },
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-8 h-8 text-blue-600" />;
      case "image": return <Image className="w-8 h-8 text-green-600" />;
      default: return <File className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Files</h1>
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              {getFileIcon(file.type)}
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="font-medium text-gray-900 mb-2 truncate">{file.name}</h3>
            <div className="text-sm text-gray-500">
              <p>{file.size}</p>
              <p>{file.uploaded}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
