
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NewNote from "@/pages/NewNote";
import NotePage from "@/pages/NotePage";
import TranscriptExtractor from "@/pages/TranscriptExtractor";
import Notebooks from "@/pages/Notebooks";
import Tags from "@/pages/Tags";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import NoteGPT from "@/pages/NoteGPT";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/new-note" element={<NewNote />} />
              <Route path="/note/:id" element={<NotePage />} />
              <Route path="/notegpt" element={<NoteGPT />} />
              <Route path="/transcript-extractor" element={<TranscriptExtractor />} />
              <Route path="/notebooks" element={<Notebooks />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
