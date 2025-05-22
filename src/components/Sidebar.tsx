
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  File,
  Hash,
  Home,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Separator } from "@/components/ui/separator";
import { useNotebooks, useTags } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
  const { data: notebooks, isLoading: notebooksLoading } = useNotebooks();
  const { data: tags, isLoading: tagsLoading } = useTags();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const sidebarItems = [
    {
      name: "Home",
      icon: <Home className="h-5 w-5" />,
      path: "/dashboard",
    },
    {
      name: "New Note",
      icon: <Plus className="h-5 w-5" />,
      path: "/new",
    },
    {
      name: "Notebooks",
      icon: <BookOpen className="h-5 w-5" />,
      path: "/notebooks",
    },
    {
      name: "Tags",
      icon: <Hash className="h-5 w-5" />,
      path: "/tags",
    },
    {
      name: "Profile",
      icon: <UserRound className="h-5 w-5" />,
      path: "/profile",
    },
    {
      name: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!collapsed && <Logo />}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <nav className="px-2">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <Link to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive(item.path) && "bg-sidebar-accent"
                    )}
                  >
                    {item.icon}
                    {!collapsed && <span className="ml-3">{item.name}</span>}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {!collapsed && (
          <>
            <Separator className="my-4" />
            
            <div className="px-4 mb-2">
              <h3 className="text-sm font-medium text-sidebar-foreground/70">
                Notebooks
              </h3>
            </div>
            <nav className="px-2">
              {notebooksLoading ? (
                <div className="px-2 py-1 text-sm text-sidebar-foreground/50">Loading...</div>
              ) : notebooks && notebooks.length > 0 ? (
                <ul className="space-y-1">
                  {notebooks.map((notebook) => (
                    <li key={notebook.id}>
                      <Button variant="ghost" className="w-full justify-start" size="sm">
                        <BookOpen className="h-4 w-4 mr-2" />
                        <span className="truncate">{notebook.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-2 py-1 text-sm text-sidebar-foreground/50">No notebooks</div>
              )}
            </nav>

            <Separator className="my-4" />
            
            <div className="px-4 mb-2">
              <h3 className="text-sm font-medium text-sidebar-foreground/70">
                Tags
              </h3>
            </div>
            <nav className="px-2">
              {tagsLoading ? (
                <div className="px-2 py-1 text-sm text-sidebar-foreground/50">Loading...</div>
              ) : tags && tags.length > 0 ? (
                <ul className="space-y-1">
                  {tags.map((tag) => (
                    <li key={tag.id}>
                      <Button variant="ghost" className="w-full justify-start" size="sm">
                        <div className={cn("h-3 w-3 rounded-full mr-2", tag.color)} />
                        <span className="truncate">{tag.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-2 py-1 text-sm text-sidebar-foreground/50">No tags</div>
              )}
            </nav>
          </>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center">
          <ThemeToggle />
          {!collapsed && user && (
            <div className="ml-3">
              <p className="text-sm font-medium">{user.email?.split("@")[0] || "User"}</p>
              <p className="text-xs text-sidebar-foreground/70">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
