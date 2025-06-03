
import { Search, Bell, Settings, Plus, Upload, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function ModNoteHeader() {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Action buttons */}
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-md">
            <Plus className="w-4 h-4 mr-2" />
            Note
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm rounded-md">
            Add Multi Media
          </Button>
          <Button className="bg-purple-400 hover:bg-purple-500 text-white px-4 py-2 text-sm rounded-md">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Type to search"
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white rounded-md"
            />
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center gap-3">
          <Button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm rounded-md">
            <Sparkles className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
                  <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || "SL"}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Sam Lee</div>
                  <div className="text-gray-500 text-xs">S.L Mobbin</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
              <DropdownMenuItem>Account</DropdownMenuItem>
              <DropdownMenuItem>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 text-sm rounded-md ml-2">
            Share
          </Button>
        </div>
      </div>
    </header>
  );
}
