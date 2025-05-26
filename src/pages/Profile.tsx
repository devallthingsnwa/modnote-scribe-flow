import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { LogOut } from "lucide-react";

const profileFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Profile() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.user_metadata?.name || "",
    },
    values: {
      email: user?.email || "",
      name: user?.user_metadata?.name || "",
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: data.email,
        data: { 
          name: data.name,
        },
      });

      if (updateError) throw updateError;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  }

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`border-b p-4 ${isMobile ? 'bg-[#0f0f0f] border-gray-800' : 'border-border bg-background'}`}>
          <div className="flex justify-between items-center gap-2">
            <h1 className={`text-2xl font-semibold ${isMobile ? 'text-white' : ''}`}>Profile</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className={`gap-2 ${isMobile ? 'mobile-ghost-button' : ''}`}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>
        
        <main className={`flex-1 overflow-y-auto p-4 pb-20 md:pb-4 ${isMobile ? 'bg-[#0f0f0f]' : ''}`}>
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="space-y-0.5">
              <h2 className={`text-2xl font-bold tracking-tight ${isMobile ? 'text-white' : ''}`}>Profile Settings</h2>
              <p className={isMobile ? 'text-gray-400' : 'text-muted-foreground'}>
                Manage your account settings and preferences.
              </p>
            </div>

            <Card className={isMobile ? 'bg-gray-900 border-gray-800' : ''}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} alt={user?.email || "User"} />
                    <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className={`text-xl ${isMobile ? 'text-white' : ''}`}>{user?.user_metadata?.name || user?.email?.split('@')[0]}</CardTitle>
                    <CardDescription className={isMobile ? 'text-gray-400' : ''}>{user?.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isMobile ? 'text-white' : ''}>Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your name" 
                              {...field} 
                              className={isMobile ? 'bg-gray-800 border-gray-700 text-white' : ''}
                            />
                          </FormControl>
                          <FormDescription className={isMobile ? 'text-gray-400' : ''}>
                            This is the name that will be displayed on your profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isMobile ? 'text-white' : ''}>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="your.email@example.com" 
                              {...field} 
                              className={isMobile ? 'bg-gray-800 border-gray-700 text-white' : ''}
                            />
                          </FormControl>
                          <FormDescription className={isMobile ? 'text-gray-400' : ''}>
                            We'll send you a verification email if you change this.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className={isMobile ? 'mobile-primary-button' : ''}
                    >
                      {isLoading ? "Updating..." : "Update profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className={isMobile ? 'bg-gray-900 border-gray-800' : ''}>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-white' : ''}>Password</CardTitle>
                <CardDescription className={isMobile ? 'text-gray-400' : ''}>
                  Change your password or reset it if you've forgotten it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="current" className={isMobile ? 'text-white' : ''}>Current password</Label>
                  <Input 
                    id="current" 
                    type="password" 
                    placeholder="••••••••" 
                    disabled 
                    className={isMobile ? 'bg-gray-800 border-gray-700' : ''}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={handlePasswordReset} 
                  disabled={isLoading}
                  className={isMobile ? 'mobile-ghost-button' : ''}
                >
                  {isLoading ? "Sending..." : "Send password reset email"}
                </Button>
              </CardFooter>
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
