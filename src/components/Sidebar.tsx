import { useState } from "react";
import {
  LayoutDashboard,
  Plus,
  FileText,
  FolderOpen,
  Tag,
  Settings as SettingsIcon,
  User,
  Book,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import { ModeToggle } from "@/components/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Note", href: "/new-note", icon: Plus },
  { name: "NoteGPT", href: "/notegpt", icon: FileText },
  { name: "Transcript Extractor", href: "/transcript-extractor", icon: FileText },
  { name: "Notebooks", href: "/notebooks", icon: FolderOpen },
  { name: "Tags", href: "/tags", icon: Tag },
];

export function Sidebar() {
  const { theme } = useTheme();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`flex flex-col h-screen bg-background border-r border-border/50 transition-width duration-300 ${
        isCollapsed ? "w-16" : "w-60"
      } overflow-hidden`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Book className="h-6 w-6 text-primary" />
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-tight">NoteSphere</span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="md:hidden text-muted-foreground hover:text-foreground focus:outline-none"
        >
          {isCollapsed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polyline points="16 17 21 12 16 7" />
              <polyline points="8 17 3 12 8 7" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M3 3h18v18H3zM9.414 8.414l6.293 6.293-1.414 1.414L8 9.414z" />
            </svg>
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigationItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-muted transition-colors ${
              location.pathname === item.href ? "bg-muted font-medium" : ""
            }`}
          >
            <item.icon className="h-4 w-4" />
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-3 space-y-3 border-t border-border/50">
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex justify-between items-center text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors">
              <div className="flex items-center space-x-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                {!isCollapsed && <span>shadcn</span>}
              </div>
              {!isCollapsed && <SettingsIcon className="h-4 w-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon className="h-4 w-4 mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
