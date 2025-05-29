
import { Search, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModeToggleProps {
  isChatMode: boolean;
  searchResultsCount: number;
  chatMessagesCount: number;
  onToggle: () => void;
  onClearChat: () => void;
}

export function ModeToggle({ 
  isChatMode, 
  searchResultsCount, 
  chatMessagesCount, 
  onToggle, 
  onClearChat 
}: ModeToggleProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant={!isChatMode ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className="flex-1 h-7 text-xs"
      >
        <Search className="h-3 w-3 mr-1" />
        Search
        {searchResultsCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-3 px-1 text-xs">
            {searchResultsCount}
          </Badge>
        )}
      </Button>
      <Button
        variant={isChatMode ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className="flex-1 h-7 text-xs"
      >
        <Bot className="h-3 w-3 mr-1" />
        Chat
        {chatMessagesCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-3 px-1 text-xs">
            {Math.floor(chatMessagesCount / 2)}
          </Badge>
        )}
      </Button>
      {isChatMode && chatMessagesCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="h-7 w-7 p-0"
          title="Clear chat"
        >
          ×
        </Button>
      )}
    </div>
  );
}
