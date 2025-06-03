
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Plus,
  Upload,
  Mic,
  FileText,
  Bell,
  Share2,
  Menu,
  MoreHorizontal,
  Grid3X3,
  List,
  Filter,
  SortAsc
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ModNoteHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  isNoteEditing?: boolean;
}

export function ModNoteHeader({
  searchQuery,
  onSearchChange,
  onNewNote,
  isNoteEditing = false
}: ModNoteHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo and Primary Actions */}
        <div className="flex items-center gap-4">
          <Logo size="md" />
          
          <div className="flex items-center gap-2">
            {/* Note Button */}
            <Button 
              onClick={onNewNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-9"
            >
              <FileText className="w-4 h-4 mr-2" />
              Note
            </Button>
            
            {/* Add Multi Media Button */}
            <Button 
              variant="outline"
              className="border-gray-300 hover:bg-gray-50 px-4 py-2 h-9"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Multi Media
            </Button>
            
            {/* Upload Button */}
            <Button 
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50 px-4 py-2 h-9"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Center Section - Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Type to search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right Section - AI, Notifications, Profile, Share */}
        <div className="flex items-center gap-3">
          {/* Ask AI Button */}
          <Button 
            variant="outline"
            className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100 px-4 py-2 h-9"
          >
            <Mic className="w-4 h-4 mr-2" />
            Ask AI
          </Button>
          
          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-gray-600" />
          </Button>
          
          {/* Share Button (only when editing a note) */}
          {isNoteEditing && (
            <Button 
              variant="outline"
              className="border-gray-300 hover:bg-gray-50 px-4 py-2 h-9"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">SL</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Sam Lee</div>
                    <div className="text-xs text-gray-500">S.L Mobbin</div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Account Settings</DropdownMenuItem>
              <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Help Center</DropdownMenuItem>
              <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
              <DropdownMenuItem>What's New</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Secondary Header for Notes Section */}
      {isNoteEditing && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">32 Notes</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <SortAsc className="w-4 h-4 mr-1" />
                Sort
              </Button>
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
              <Button variant="ghost" size="sm">
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              My Notebook
            </Badge>
            <span className="text-gray-400">›</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Product Team Meeting
            </Badge>
          </div>
        </div>
      )}
    </header>
  );
}
