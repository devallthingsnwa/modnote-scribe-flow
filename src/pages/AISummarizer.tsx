
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { AISummarizer as AISummarizerComponent } from "@/components/AISummarizer";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavigation } from "@/components/MobileNavigation";

export default function AISummarizer() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleBack = () => {
    navigate("/dashboard");
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="border-b border-border p-4 flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">AI Summarizer</h1>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4">
          <AISummarizerComponent />
        </main>
        
        <div className="h-20">
          {/* Space for mobile navigation */}
        </div>
        
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border p-6">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-3">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">AI Video Summarizer</h1>
              <p className="text-muted-foreground">Generate intelligent summaries from YouTube videos</p>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6">
          <AISummarizerComponent />
        </main>
      </div>
    </div>
  );
}
