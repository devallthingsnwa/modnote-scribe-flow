
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  
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
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Default Notebook</h3>
                  <p className="text-sm text-muted-foreground">
                    Select the default notebook for new notes.
                  </p>
                  <p className="text-sm mt-2">
                    This feature will be implemented in a future update.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Editor Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your note editor experience.
                  </p>
                  <p className="text-sm mt-2">
                    This feature will be implemented in a future update.
                  </p>
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
                    onClick={() => {
                      toast({
                        title: "Feature not implemented",
                        description: "This feature will be available in a future update.",
                      });
                    }}
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
