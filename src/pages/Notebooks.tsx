import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  useNotebooks, 
  useCreateNotebook, 
  useUpdateNotebook, 
  useDeleteNotebook,
  Notebook
} from "@/lib/api";
import { Edit, Trash, Plus, BookOpen, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Notebooks() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookDescription, setNewNotebookDescription] = useState("");
  const [editedNotebookName, setEditedNotebookName] = useState("");
  const [editedNotebookDescription, setEditedNotebookDescription] = useState("");
  
  const { data: notebooks, isLoading, error } = useNotebooks();
  const createNotebookMutation = useCreateNotebook();
  const updateNotebookMutation = useUpdateNotebook();
  const deleteNotebookMutation = useDeleteNotebook();
  
  const filteredNotebooks = notebooks?.filter(notebook => {
    if (!searchQuery) return true;
    return notebook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           notebook.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateNotebook = () => {
    if (newNotebookName.trim() === "") {
      toast({
        title: "Error",
        description: "Notebook name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    createNotebookMutation.mutate(
      {
        name: newNotebookName,
        description: newNotebookDescription || undefined
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
          setNewNotebookName("");
          setNewNotebookDescription("");
          toast({
            title: "Success",
            description: "Notebook created successfully"
          });
        },
        onError: (error) => {
          console.error("Error creating notebook:", error);
          toast({
            title: "Error",
            description: "Failed to create notebook",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  const handleUpdateNotebook = () => {
    if (!selectedNotebook) return;
    if (editedNotebookName.trim() === "") {
      toast({
        title: "Error",
        description: "Notebook name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    updateNotebookMutation.mutate(
      {
        id: selectedNotebook.id,
        updates: {
          name: editedNotebookName,
          description: editedNotebookDescription || null
        }
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setSelectedNotebook(null);
          toast({
            title: "Success",
            description: "Notebook updated successfully"
          });
        },
        onError: (error) => {
          console.error("Error updating notebook:", error);
          toast({
            title: "Error",
            description: "Failed to update notebook",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  const handleDeleteNotebook = () => {
    if (!selectedNotebook) return;
    
    deleteNotebookMutation.mutate(
      selectedNotebook.id,
      {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setSelectedNotebook(null);
          toast({
            title: "Success",
            description: "Notebook deleted successfully"
          });
        },
        onError: (error) => {
          console.error("Error deleting notebook:", error);
          toast({
            title: "Error",
            description: "Failed to delete notebook",
            variant: "destructive"
          });
        }
      }
    );
  };
  
  const openEditModal = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setEditedNotebookName(notebook.name);
    setEditedNotebookDescription(notebook.description || "");
    setIsEditModalOpen(true);
  };
  
  const openDeleteModal = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b p-4 ${isMobile ? 'bg-[#0f0f0f] border-gray-800' : 'border-border bg-background'}`}>
          <div className="flex justify-between items-center gap-2">
            {isMobile && <MobileNavigation />}
            <h1 className={`text-2xl font-semibold ${isMobile ? 'text-white' : ''}`}>Notebooks</h1>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className={isMobile ? 'mobile-primary-button' : ''}
              variant={isMobile ? "ghost" : "default"}
              size={isMobile ? "icon" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {!isMobile && "New Notebook"}
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <Input
              placeholder="Search notebooks..."
              className={`pl-10 w-full ${isMobile ? 'mobile-search' : ''}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>
        
        <main className={`flex-1 overflow-y-auto p-4 pb-20 md:pb-4 ${isMobile ? 'bg-[#0f0f0f]' : ''}`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className={`animate-pulse ${isMobile ? 'text-gray-400' : ''}`}>Loading notebooks...</div>
            </div>
          ) : error ? (
            <div className={`text-center p-4 ${isMobile ? 'text-red-400' : 'text-red-500'}`}>
              Error loading notebooks. Please try again.
            </div>
          ) : filteredNotebooks && filteredNotebooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredNotebooks.map((notebook) => (
                <Card key={notebook.id} className={`overflow-hidden ${isMobile ? 'bg-gray-900 border-gray-800' : ''}`}>
                  <CardHeader className={isMobile ? 'bg-gray-800' : 'bg-card'}>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-white' : ''}`}>
                      <BookOpen className="h-5 w-5" />
                      {notebook.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className={`text-sm line-clamp-2 ${isMobile ? 'text-gray-300' : 'text-muted-foreground'}`}>
                      {notebook.description || "No description"}
                    </p>
                  </CardContent>
                  <CardFooter className={`border-t flex justify-between p-2 ${isMobile ? 'bg-gray-800 border-gray-700' : 'bg-muted/50'}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditModal(notebook)}
                      className={isMobile ? 'mobile-ghost-button' : ''}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`text-destructive hover:text-destructive ${isMobile ? 'mobile-ghost-button' : ''}`}
                      onClick={() => openDeleteModal(notebook)}
                    >
                      <Trash className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className={`text-center p-8 flex flex-col items-center ${isMobile ? 'mobile-empty-state' : ''}`}>
              <div className={`rounded-full p-6 mb-4 ${isMobile ? 'mobile-empty-icon' : 'bg-muted/30'}`}>
                <BookOpen className={`h-12 w-12 ${isMobile ? 'text-gray-400' : 'text-muted-foreground/60'}`} />
              </div>
              <p className={`mb-4 ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
                {searchQuery ? "No notebooks matching your search" : "No notebooks found. Create your first notebook!"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className={isMobile ? 'mobile-primary-button' : ''}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notebook
                </Button>
              )}
            </div>
          )}
        </main>
        
        {/* Mobile Bottom Navigation Space */}
        <div className="h-20 md:hidden" />
      </div>
      
      {/* Mobile Navigation */}
      {isMobile && <MobileNavigation />}
      
      {/* Create Notebook Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Notebook</DialogTitle>
            <DialogDescription>
              Create a new notebook to organize your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="My Notebook"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newNotebookDescription}
                onChange={(e) => setNewNotebookDescription(e.target.value)}
                placeholder="Write a description for your notebook..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNotebook} disabled={createNotebookMutation.isPending}>
              {createNotebookMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Notebook Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notebook</DialogTitle>
            <DialogDescription>
              Update notebook details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editedNotebookName}
                onChange={(e) => setEditedNotebookName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editedNotebookDescription}
                onChange={(e) => setEditedNotebookDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNotebook} disabled={updateNotebookMutation.isPending}>
              {updateNotebookMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Notebook Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notebook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this notebook? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteNotebook}
              disabled={deleteNotebookMutation.isPending}
            >
              {deleteNotebookMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
