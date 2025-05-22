
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  useTags, 
  useCreateTag, 
  useUpdateTag, 
  useDeleteTag,
  Tag
} from "@/lib/api";
import { Edit, Trash, Plus, Hash, CirclePlus } from "lucide-react";
import { cn } from "@/lib/utils";

// Tag color options
const colorOptions = [
  { name: "Gray", value: "bg-gray-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Amber", value: "bg-amber-500" },
  { name: "Yellow", value: "bg-yellow-500" },
  { name: "Lime", value: "bg-lime-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Emerald", value: "bg-emerald-500" },
  { name: "Teal", value: "bg-teal-500" },
  { name: "Cyan", value: "bg-cyan-500" },
  { name: "Sky", value: "bg-sky-500" },
  { name: "Blue", value: "bg-blue-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Violet", value: "bg-violet-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Fuchsia", value: "bg-fuchsia-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Rose", value: "bg-rose-500" },
];

export default function Tags() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("bg-blue-500");
  const [editedTagName, setEditedTagName] = useState("");
  const [editedTagColor, setEditedTagColor] = useState("");
  
  const { data: tags, isLoading, error } = useTags();
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();
  
  const handleCreateTag = () => {
    if (newTagName.trim() === "") {
      toast({
        title: "Error",
        description: "Tag name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    createTagMutation.mutate(
      {
        name: newTagName,
        color: newTagColor
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
          setNewTagName("");
          setNewTagColor("bg-blue-500");
          toast({
            title: "Success",
            description: "Tag created successfully"
          });
        },
        onError: (error) => {
          console.error("Error creating tag:", error);
          toast({
            title: "Error",
            description: "Failed to create tag",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  const handleUpdateTag = () => {
    if (!selectedTag) return;
    if (editedTagName.trim() === "") {
      toast({
        title: "Error",
        description: "Tag name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    updateTagMutation.mutate(
      {
        id: selectedTag.id,
        updates: {
          name: editedTagName,
          color: editedTagColor
        }
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setSelectedTag(null);
          toast({
            title: "Success",
            description: "Tag updated successfully"
          });
        },
        onError: (error) => {
          console.error("Error updating tag:", error);
          toast({
            title: "Error",
            description: "Failed to update tag",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  const handleDeleteTag = () => {
    if (!selectedTag) return;
    
    deleteTagMutation.mutate(
      selectedTag.id,
      {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setSelectedTag(null);
          toast({
            title: "Success",
            description: "Tag deleted successfully"
          });
        },
        onError: (error) => {
          console.error("Error deleting tag:", error);
          toast({
            title: "Error",
            description: "Failed to delete tag",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  const openEditModal = (tag: Tag) => {
    setSelectedTag(tag);
    setEditedTagName(tag.name);
    setEditedTagColor(tag.color);
    setIsEditModalOpen(true);
  };
  
  const openDeleteModal = (tag: Tag) => {
    setSelectedTag(tag);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Tags</h1>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Tag
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse">Loading tags...</div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">
              Error loading tags. Please try again.
            </div>
          ) : tags && tags.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tags.map((tag) => (
                <Card key={tag.id} className="overflow-hidden">
                  <CardHeader className={cn("flex flex-row items-center gap-2 py-3", tag.color, "bg-opacity-15")}>
                    <div className={cn("h-3 w-3 rounded-full", tag.color)} />
                    <span className="font-medium">{tag.name}</span>
                  </CardHeader>
                  <CardFooter className="bg-muted/50 border-t flex justify-between p-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditModal(tag)}
                      className="h-8 px-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openDeleteModal(tag)}
                      className="h-8 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              <Card 
                className="flex items-center justify-center cursor-pointer border-dashed"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <CirclePlus className="h-8 w-8 mb-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Add New Tag</span>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">No tags found. Create your first tag!</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Tag
              </Button>
            </div>
          )}
        </main>
      </div>
      
      {/* Create Tag Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to categorize your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Work"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={newTagColor} onValueChange={setNewTagColor}>
                <SelectTrigger id="color" className="w-full">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", color.value)} />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Preview:</span>
                <div className={cn("h-3 w-3 rounded-full", newTagColor)} />
                <span className="text-sm font-medium">{newTagName || "Tag Name"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={createTagMutation.isPending}>
              {createTagMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Tag Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update tag details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editedTagName}
                onChange={(e) => setEditedTagName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <Select value={editedTagColor} onValueChange={setEditedTagColor}>
                <SelectTrigger id="edit-color" className="w-full">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-3 w-3 rounded-full", color.value)} />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Preview:</span>
                <div className={cn("h-3 w-3 rounded-full", editedTagColor)} />
                <span className="text-sm font-medium">{editedTagName || "Tag Name"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTag} disabled={updateTagMutation.isPending}>
              {updateTagMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Tag Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tag? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTag}
              disabled={deleteTagMutation.isPending}
            >
              {deleteTagMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
