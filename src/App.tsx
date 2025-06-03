
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotePage from "./pages/NotePage";
import NewNote from "./pages/NewNote";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notebooks from "./pages/Notebooks";
import Tags from "./pages/Tags";
import AIResearch from "./pages/AIResearch";
import AISummarizer from "./pages/AISummarizer";
import ModNoteDashboard from "./pages/ModNoteDashboard";
import ModNoteNotebooks from "./pages/ModNoteNotebooks";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ModNoteDashboard />} />
              <Route path="/notebooks" element={<ModNoteNotebooks />} />
              <Route path="/note/:id" element={<NotePage />} />
              <Route path="/new" element={<NewNote />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/ai-research" element={<AIResearch />} />
              <Route path="/ai-summarizer" element={<AISummarizer />} />
              <Route path="/legacy-dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
