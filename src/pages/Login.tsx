
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
import { GoogleIcon } from "@/components/GoogleIcon";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
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

  const handleGoogleAuth = () => {
    // Google auth will be implemented later
    // Updated toast syntax for sonner
    toast("Coming soon", {
      description: "Google authentication will be available soon.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <Logo size="lg" className="mb-2" />
          <p className="text-muted-foreground">
            Modern note-taking for the digital age
          </p>
        </div>
        
        <Card className="animate-fade-in">
          <Tabs defaultValue="login">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Welcome</CardTitle>
                <TabsList>
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription>
                Get started with your ModNote journey
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Button
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={isLoading || authLoading}
                className="w-full mb-4"
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>
              
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <a
                          href="#"
                          className="text-xs text-muted-foreground hover:text-primary"
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
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || authLoading}>
                      {isLoading || authLoading ? "Logging in..." : "Login"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignupSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="signup-name">Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={signupForm.name}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupForm.email}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="signup-password">Password</Label>
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
                      />
                    </div>
                    <Button type="submit" disabled={isLoading || authLoading}>
                      {isLoading || authLoading ? "Creating account..." : "Create account"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </CardContent>
            
            <CardFooter className="text-sm text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </CardFooter>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
