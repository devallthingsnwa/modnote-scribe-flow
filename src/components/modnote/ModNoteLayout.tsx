
import { ReactNode } from "react";
import { ModNoteSidebar } from "./ModNoteSidebar";
import { ModNoteHeader } from "./ModNoteHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface ModNoteLayoutProps {
  children: ReactNode;
}

export function ModNoteLayout({ children }: ModNoteLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block">
        <ModNoteSidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ModNoteHeader />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
