
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Login() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn(loginForm.email, loginForm.password);
      // Auth provider will handle redirect to dashboard
    } catch (error) {
      setIsLoading(false);
      // Error handling is done in the Auth provider
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signUp(signupForm.email, signupForm.password);
      // Updated toast syntax for sonner
      toast("Account created!", {
        description: "Please check your email for confirmation.",
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      // Error handling is done in the Auth provider
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${
      isMobile ? 'bg-[#0f0f0f]' : 'bg-background'
    }`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <Logo size="lg" className="mb-2" />
          <p className={isMobile ? 'text-gray-400' : 'text-muted-foreground'}>
            Modern note-taking for the digital age
          </p>
        </div>
        
        <Card className={`animate-fade-in ${isMobile ? 'bg-gray-900 border-gray-800' : ''}`}>
          <Tabs defaultValue="login">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className={isMobile ? 'text-white' : ''}>Welcome</CardTitle>
                <TabsList className={isMobile ? 'bg-gray-800 border-gray-700' : ''}>
                  <TabsTrigger 
                    value="login"
                    className={isMobile ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400' : ''}
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className={isMobile ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400' : ''}
                  >
                    Sign up
                  </TabsTrigger>
                </TabsList>
              </div>
              <CardDescription className={isMobile ? 'text-gray-400' : ''}>
                Get started with your ModNote journey
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="login-email" className={isMobile ? 'text-white' : ''}>Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        required
                        className={isMobile ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400' : ''}
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <Label htmlFor="login-password" className={isMobile ? 'text-white' : ''}>Password</Label>
                        <a
                          href="#"
                          className={`text-xs hover:text-primary ${
                            isMobile ? 'text-gray-400' : 'text-muted-foreground'
                          }`}
                        >
                          Forgot password?
                        </a>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        required
                        className={isMobile ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400' : ''}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading || authLoading}
                      className={isMobile ? 'mobile-primary-button' : ''}
                    >
                      {isLoading || authLoading ? "Logging in..." : "Login"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignupSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="signup-name" className={isMobile ? 'text-white' : ''}>Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={signupForm.name}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, name: e.target.value })
                        }
                        required
                        className={isMobile ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400' : ''}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="signup-email" className={isMobile ? 'text-white' : ''}>Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupForm.email}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, email: e.target.value })
                        }
                        required
                        className={isMobile ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400' : ''}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="signup-password" className={isMobile ? 'text-white' : ''}>Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupForm.password}
                        onChange={(e) =>
                          setSignupForm({
                            ...signupForm,
                            password: e.target.value,
                          })
                        }
                        required
                        className={isMobile ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400' : ''}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading || authLoading}
                      className={isMobile ? 'mobile-primary-button' : ''}
                    >
                      {isLoading || authLoading ? "Creating account..." : "Create account"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </CardContent>
            
            <CardFooter className={`text-sm text-center ${
              isMobile ? 'text-gray-400' : 'text-muted-foreground'
            }`}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
