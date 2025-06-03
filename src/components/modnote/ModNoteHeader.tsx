
import { Search, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

export function ModNoteHeader() {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Action buttons */}
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm">
            New
          </Button>
          <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50 px-4 py-2 text-sm">
            Add Multi Media
          </Button>
          <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50 px-4 py-2 text-sm">
            Upload
          </Button>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Type to search"
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center gap-3">
          <Button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm">
            Ask AI
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Settings className="w-5 h-5" />
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
            <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{user?.user_metadata?.name || user?.email?.split('@')[0] || "User"}</span>
        </div>
      </div>
    </header>
  );
}
