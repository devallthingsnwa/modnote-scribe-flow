
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background dark:bg-sidebar border-t md:hidden">
        <div className="grid grid-cols-5 gap-1 p-1">
          {navigationItems.map((item) => (
            <Link key={item.name} to={item.path} className="flex flex-col items-center justify-center p-2">
              <Button 
                variant={isActive(item.path) ? "secondary" : "ghost"} 
                size="icon" 
                className={cn(
                  "size-10 rounded-full",
                  isActive(item.path) ? "bg-secondary text-primary" : "text-muted-foreground"
                )}
              >
                {item.icon}
              </Button>
              <span className="text-[10px] mt-1 text-muted-foreground">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Slide-out menu sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[80%] sm:w-[350px] bg-sidebar text-sidebar-foreground">
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
                            "w-full justify-start",
                            isActive(item.path) && "bg-sidebar-accent"
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
            
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                {user && (
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.email?.split("@")[0] || "User"}</p>
                    <p className="text-xs text-sidebar-foreground/70">{user.email}</p>
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
