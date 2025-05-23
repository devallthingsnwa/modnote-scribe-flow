import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotebooks } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
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
    // Convert "none" back to null for defaultNotebookId
    if (key === 'defaultNotebookId' && value === 'none') {
      value = null;
    }
    
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
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b p-4 ${isMobile ? 'bg-[#0f0f0f] border-gray-800' : 'border-border bg-background'}`}>
          <div className="flex justify-between items-center gap-2">
            <h1 className={`text-2xl font-semibold ${isMobile ? 'text-white' : ''}`}>Settings</h1>
          </div>
        </header>
        
        <main className={`flex-1 overflow-y-auto p-4 pb-20 md:pb-4 ${isMobile ? 'bg-[#0f0f0f]' : ''}`}>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className={isMobile ? 'bg-gray-900 border-gray-800' : ''}>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-white' : ''}>Application Settings</CardTitle>
                <CardDescription className={isMobile ? 'text-gray-400' : ''}>
                  Configure your application preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className={`text-lg font-medium ${isMobile ? 'text-white' : ''}`}>Default Notebook</h3>
                  <p className={`text-sm mb-2 ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
                    Select the default notebook for new notes.
                  </p>
                  <Select 
                    value={preferences.defaultNotebookId || "none"} 
                    onValueChange={(value) => handlePreferenceChange('defaultNotebookId', value)}
                  >
                    <SelectTrigger className={`w-full md:w-[250px] ${isMobile ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
                      <SelectValue placeholder="Select a notebook" />
                    </SelectTrigger>
                    <SelectContent className={isMobile ? 'bg-gray-800 border-gray-700' : ''}>
                      <SelectItem value="none" className={isMobile ? 'text-white focus:bg-gray-700' : ''}>None</SelectItem>
                      {notebooks?.map((notebook) => (
                        <SelectItem 
                          key={notebook.id} 
                          value={notebook.id}
                          className={isMobile ? 'text-white focus:bg-gray-700' : ''}
                        >
                          {notebook.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className={`text-lg font-medium ${isMobile ? 'text-white' : ''}`}>Editor Preferences</h3>
                  <p className={`text-sm mb-2 ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
                    Customize your note editor experience.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-save" className={isMobile ? 'text-white' : ''}>Auto-save interval (seconds)</Label>
                        <p className={`text-sm ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
                          How frequently should your notes be auto-saved?
                        </p>
                      </div>
                      <Select 
                        value={preferences.autoSaveInterval.toString()}
                        onValueChange={(value) => handlePreferenceChange('autoSaveInterval', parseInt(value))}
                      >
                        <SelectTrigger className={`w-[100px] ${isMobile ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isMobile ? 'bg-gray-800 border-gray-700' : ''}>
                          <SelectItem value="15" className={isMobile ? 'text-white focus:bg-gray-700' : ''}>15</SelectItem>
                          <SelectItem value="30" className={isMobile ? 'text-white focus:bg-gray-700' : ''}>30</SelectItem>
                          <SelectItem value="60" className={isMobile ? 'text-white focus:bg-gray-700' : ''}>60</SelectItem>
                          <SelectItem value="120" className={isMobile ? 'text-white focus:bg-gray-700' : ''}>120</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="dark-mode" className={isMobile ? 'text-white' : ''}>Dark mode by default</Label>
                        <p className={`text-sm ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
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
                    className={isMobile ? 'mobile-primary-button' : ''}
                  >
                    {isLoading ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className={isMobile ? 'bg-gray-900 border-gray-800' : ''}>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-white' : ''}>Danger Zone</CardTitle>
                <CardDescription className={isMobile ? 'text-gray-400' : ''}>
                  Be careful with these actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`font-medium ${isMobile ? 'text-white' : ''}`}>Clear all notes</h3>
                    <p className={`text-sm ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
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
        
        {/* Mobile Bottom Navigation Space */}
        <div className="h-20 md:hidden" />
      </div>
      
      {/* Mobile Navigation */}
      {isMobile && <MobileNavigation />}
    </div>
  );
}
