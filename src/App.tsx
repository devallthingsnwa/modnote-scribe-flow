
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";

// Page imports
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import EnhancedModNoteDashboard from "@/pages/EnhancedModNoteDashboard";
import ModNoteDashboard from "@/pages/ModNoteDashboard";
import NewNote from "@/pages/NewNote";
import NotePage from "@/pages/NotePage";
import Notebooks from "@/pages/Notebooks";
import ModNoteNotebooks from "@/pages/ModNoteNotebooks";
import Tags from "@/pages/Tags";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import AIResearch from "@/pages/AIResearch";
import AISummarizer from "@/pages/AISummarizer";
import TranscriptExtractor from "@/pages/TranscriptExtractor";
import TestPage from "@/pages/TestPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="app-theme">
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/enhanced-dashboard" element={<EnhancedModNoteDashboard />} />
              <Route path="/modnote" element={<ModNoteDashboard />} />
              <Route path="/new-note" element={<NewNote />} />
              <Route path="/note/:id" element={<NotePage />} />
              <Route path="/notebooks" element={<Notebooks />} />
              <Route path="/modnote-notebooks" element={<ModNoteNotebooks />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/ai-research" element={<AIResearch />} />
              <Route path="/ai-summarizer" element={<AISummarizer />} />
              <Route path="/transcript-extractor" element={<TranscriptExtractor />} />
              <Route path="/test" element={<TestPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
