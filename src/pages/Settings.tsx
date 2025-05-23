
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotebooks } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

// Define types for user preferences
interface UserPreferences {
  defaultNotebookId: string | null;
  darkModeEnabled: boolean;
  autoSaveInterval: number;
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: notebooks } = useNotebooks();
  
  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultNotebookId: null,
    darkModeEnabled: false,
    autoSaveInterval: 30
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Load user preferences from localStorage on component mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);
  
  // Function to load user preferences
  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      // Use localStorage to store user preferences
      const savedPrefs = localStorage.getItem(`user_preferences_${user.id}`);
      
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs);
        setPreferences({
          ...preferences,
          ...parsedPrefs
        });
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
    }
  };
  
  // Function to save user preferences
  const saveUserPreferences = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Store preferences in localStorage
      localStorage.setItem(
        `user_preferences_${user.id}`,
        JSON.stringify(preferences)
      );
      
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully."
      });
    } catch (error: any) {
      console.error("Failed to save preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle preference changes
  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences({
      ...preferences,
      [key]: value
    });
  };
  
  // Handle clear notes button click
  const handleClearNotes = () => {
    toast({
      title: "Feature not implemented",
      description: "This feature will be available in a future update.",
    });
  };
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-4">
          <h1 className="text-2xl font-semibold">Settings</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>
                  Configure your application preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Default Notebook</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select the default notebook for new notes.
                  </p>
                  <Select 
                    value={preferences.defaultNotebookId || ""} 
                    onValueChange={(value) => handlePreferenceChange('defaultNotebookId', value || null)}
                  >
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue placeholder="Select a notebook" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {notebooks?.map((notebook) => (
                        <SelectItem key={notebook.id} value={notebook.id}>
                          {notebook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Editor Preferences</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Customize your note editor experience.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-save">Auto-save interval (seconds)</Label>
                        <p className="text-sm text-muted-foreground">
                          How frequently should your notes be auto-saved?
                        </p>
                      </div>
                      <Select 
                        value={preferences.autoSaveInterval.toString()}
                        onValueChange={(value) => handlePreferenceChange('autoSaveInterval', parseInt(value))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="120">120</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode">Dark mode by default</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable dark mode by default when opening the app.
                        </p>
                      </div>
                      <Switch 
                        id="dark-mode"
                        checked={preferences.darkModeEnabled}
                        onCheckedChange={(checked) => handlePreferenceChange('darkModeEnabled', checked)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={saveUserPreferences}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>
                  Be careful with these actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Clear all notes</h3>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete all your notes.
                    </p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleClearNotes}
                  >
                    Clear All Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
