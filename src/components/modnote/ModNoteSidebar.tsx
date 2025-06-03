
import { Home, Bookmark, FileText, Folder, Tag, Share2, Trash2, UserPlus, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModNoteSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export function ModNoteSidebar({ selectedSection, onSectionChange }: ModNoteSidebarProps) {
  const menuItems = [
    { icon: Home, label: "Home", key: "home" },
    { icon: Bookmark, label: "Shortcuts", key: "shortcuts" },
    { icon: FileText, label: "Notes", key: "notes" },
    { icon: Folder, label: "Files", key: "files" },
    { icon: Folder, label: "Notebooks", key: "notebooks" },
    { icon: Tag, label: "Tags", key: "tags" },
    { icon: Share2, label: "Shared With Me", key: "shared" },
    { icon: Trash2, label: "Trash", key: "trash" },
    { icon: UserPlus, label: "Invite Users", key: "invite" },
  ];

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Navigation */}
      <nav className="flex-1 p-4 pt-6">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = selectedSection === item.key;
            return (
              <button
                key={item.label}
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Get Started */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
          <Play className="w-4 h-4" />
          Get Started
        </button>
      </div>
    </div>
  );
}
