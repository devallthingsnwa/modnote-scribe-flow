
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Plus, Hash, Settings, Menu, User } from "lucide-react";
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
      
      {/* Slide-out menu sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-gray-800 rounded-xl">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[80%] sm:w-[350px] bg-[#0f0f0f] border-gray-800 text-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4">
              <Logo />
            </div>
            
            <div className="flex-1 overflow-auto py-2">
              <nav className="px-2">
                <ul className="space-y-2">
                  {navigationItems.map((item) => (
                    <li key={item.name}>
                      <Link to={item.path}>
                        <Button
                          variant={isActive(item.path) ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start rounded-xl transition-all duration-200",
                            isActive(item.path) 
                              ? "bg-gray-800 text-primary hover:bg-gray-700" 
                              : "text-gray-300 hover:bg-gray-800 hover:text-white"
                          )}
                        >
                          {item.icon}
                          <span className="ml-3">{item.name}</span>
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                {user && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{user.email?.split("@")[0] || "User"}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
