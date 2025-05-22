
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

// Sample tags data - in a real app, this would come from an API
const tagsData = [
  { id: 1, name: "Important", color: "bg-red-500" },
  { id: 2, name: "Idea", color: "bg-modnote-blue" },
  { id: 3, name: "Todo", color: "bg-modnote-green" },
  { id: 4, name: "Resource", color: "bg-modnote-yellow" },
  { id: 5, name: "Project", color: "bg-modnote-purple" },
  { id: 6, name: "Personal", color: "bg-modnote-pink" },
  { id: 7, name: "Work", color: "bg-gray-500" },
];

interface TagSelectorProps {
  selectedTags: number[];
  onChange: (selectedTags: number[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleRemove = (tagId: number) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags selected</span>
        ) : (
          selectedTags.map((tagId) => {
            const tag = tagsData.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <Badge
                key={tag.id}
                variant="outline"
                className={cn("flex items-center gap-1 px-3 py-1")}
              >
                <div className={cn("h-2 w-2 rounded-full", tag.color)} />
                {tag.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleRemove(tag.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex justify-between w-[200px]"
          >
            Add Tags
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>
                <div className="flex justify-center p-2">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create tag
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup heading="Tags">
                {tagsData.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleSelect(tag.id)}
                    className="flex items-center"
                  >
                    <div className={cn("h-3 w-3 rounded-full mr-2", tag.color)} />
                    {tag.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedTags.includes(tag.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
