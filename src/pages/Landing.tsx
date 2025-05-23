
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
import { FileText, Zap, Shield, Users, ArrowRight, Star } from "lucide-react";

export default function Landing() {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
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
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signUp(signupForm.email, signupForm.password);
      toast("Account created!", {
        description: "Please check your email for confirmation.",
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Smart Note Organization",
      description: "Organize your thoughts with intelligent tagging and categorization that adapts to your workflow."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Built for speed with instant search, quick capture, and seamless synchronization across all devices."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your notes are encrypted and secure. We respect your privacy and never read your content."
    },
    {
      icon: Users,
      title: "Collaboration Ready",
      description: "Share notes and collaborate with your team in real-time. Perfect for students and professionals."
    }
  ];

  const testimonials = [
    {
      name: "Alex Chen",
      role: "Computer Science Student",
      content: "ModNote has revolutionized how I take lecture notes. The organization features are incredible!",
      rating: 5
    },
    {
      name: "Sarah Johnson",
      role: "Marketing Manager",
      content: "Finally, a note-taking app that understands how modern teams work. Love the collaboration features.",
      rating: 5
    },
    {
      name: "David Kim",
      role: "Freelance Designer",
      content: "Clean, fast, and intuitive. ModNote helps me stay organized and focused on what matters.",
      rating: 5
    }
  ];

  return (
    <div className={`min-h-screen ${isMobile ? 'bg-[#0f0f0f]' : 'bg-background'}`}>
      {/* Header */}
      <header className={`border-b ${isMobile ? 'border-gray-800 bg-[#0f0f0f]' : 'border-border bg-background'} sticky top-0 z-50`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              onClick={() => setShowAuth(true)}
              className={isMobile ? 'mobile-primary-button' : ''}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className={`text-5xl md:text-7xl font-bold mb-6 ${isMobile ? 'text-white' : ''}`}>
            Modern Note-Taking for{" "}
            <span className="text-modnote-purple">Gen Z</span>
          </h1>
          <p className={`text-xl md:text-2xl mb-8 ${isMobile ? 'text-gray-300' : 'text-muted-foreground'}`}>
            Capture, organize, and share your thoughts with the most intuitive note-taking app designed for the digital generation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setShowAuth(true)}
              className={`text-lg px-8 py-6 ${isMobile ? 'mobile-primary-button' : ''}`}
            >
              Start Taking Notes <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className={`text-lg px-8 py-6 ${isMobile ? 'mobile-ghost-button' : ''}`}
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-16 ${isMobile ? 'bg-gray-900' : 'bg-muted/30'}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isMobile ? 'text-white' : ''}`}>
              Everything you need to stay organized
            </h2>
            <p className={`text-lg ${isMobile ? 'text-gray-300' : 'text-muted-foreground'}`}>
              Powerful features designed for modern note-taking
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`text-center ${isMobile ? 'bg-gray-800 border-gray-700' : ''}`}>
                <CardHeader>
                  <div className="mx-auto bg-modnote-purple/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-modnote-purple" />
                  </div>
                  <CardTitle className={`text-xl ${isMobile ? 'text-white' : ''}`}>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={isMobile ? 'text-gray-300' : 'text-muted-foreground'}>{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isMobile ? 'text-white' : ''}`}>
              Loved by students and professionals
            </h2>
            <p className={`text-lg ${isMobile ? 'text-gray-300' : 'text-muted-foreground'}`}>
              See what our users have to say about ModNote
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className={isMobile ? 'bg-gray-900 border-gray-800' : ''}>
                <CardHeader>
                  <div className="flex mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-modnote-purple text-modnote-purple" />
                    ))}
                  </div>
                  <CardDescription className={`text-base ${isMobile ? 'text-gray-300' : ''}`}>
                    "{testimonial.content}"
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <div>
                    <p className={`font-semibold ${isMobile ? 'text-white' : ''}`}>{testimonial.name}</p>
                    <p className={`text-sm ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>{testimonial.role}</p>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-16 ${isMobile ? 'bg-gray-900' : 'bg-muted/30'}`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isMobile ? 'text-white' : ''}`}>
            Ready to transform your note-taking?
          </h2>
          <p className={`text-lg mb-8 ${isMobile ? 'text-gray-300' : 'text-muted-foreground'}`}>
            Join thousands of users who have already made the switch to ModNote
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowAuth(true)}
            className={`text-lg px-8 py-6 ${isMobile ? 'mobile-primary-button' : ''}`}
          >
            Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className={`animate-fade-in ${isMobile ? 'bg-gray-900 border-gray-800' : ''}`}>
              <Tabs defaultValue="login">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className={isMobile ? 'text-white' : ''}>Welcome to ModNote</CardTitle>
                    <div className="flex items-center gap-2">
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowAuth(false)}
                        className={isMobile ? 'text-gray-400 hover:text-white' : ''}
                      >
                        ×
                      </Button>
                    </div>
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
                          <Label htmlFor="login-password" className={isMobile ? 'text-white' : ''}>Password</Label>
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
      )}

      {/* Footer */}
      <footer className={`border-t py-8 ${isMobile ? 'border-gray-800 bg-[#0f0f0f]' : 'border-border bg-background'}`}>
        <div className="container mx-auto px-4 text-center">
          <Logo size="sm" className="mb-4" />
          <p className={`text-sm ${isMobile ? 'text-gray-400' : 'text-muted-foreground'}`}>
            © 2024 ModNote. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
