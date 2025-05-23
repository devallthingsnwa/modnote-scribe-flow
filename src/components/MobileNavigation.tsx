
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Plus, Hash, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

export function MobileNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const navigationItems = [
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
      name: "Settings",
      icon: <Settings className="h-5 w-5" />,
      path: "/settings",
    },
  ];

  return (
    <>
      {/* Bottom navigation for quick access */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-gray-800">
        <div className="grid grid-cols-5 gap-1 p-1">
          {navigationItems.map((item) => (
            <Link key={item.name} to={item.path} className="mobile-nav-item">
              <Button 
                variant="ghost"
                size="icon" 
                className={cn(
                  "size-10 rounded-xl transition-all duration-200",
                  isActive(item.path) 
                    ? "bg-gray-800 text-primary shadow-lg" 
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                {item.icon}
              </Button>
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                isActive(item.path) ? "text-primary" : "text-gray-400"
              )}>
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
