
import { Home, Bookmark, FileText, Folder, Tag, Share2, Trash2, UserPlus, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "react-router-dom";

export function ModNoteSidebar() {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: "Home", path: "/dashboard", count: null },
    { icon: Bookmark, label: "Shortcuts", path: "/shortcuts", count: null },
    { icon: FileText, label: "Notes", path: "/dashboard", count: null },
    { icon: Folder, label: "Files", path: "/files", count: null },
    { icon: Folder, label: "Notebooks", path: "/notebooks", count: null },
    { icon: Tag, label: "Tags", path: "/tags", count: null },
    { icon: Share2, label: "Shared With Me", path: "/shared", count: null },
    { icon: Trash2, label: "Trash", path: "/trash", count: null },
    { icon: UserPlus, label: "Invite Users", path: "/invite", count: null },
  ];

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-gray-900">ModNote</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.count && (
                  <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
              </Link>
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
