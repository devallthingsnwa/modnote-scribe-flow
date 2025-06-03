
import { ModNoteHeader } from "./ModNoteHeader";
import { ModNoteSidebar } from "./ModNoteSidebar";

interface ModNoteLayoutProps {
  children: React.ReactNode;
}

export function ModNoteLayout({ children }: ModNoteLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <ModNoteSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - only render once here */}
        <ModNoteHeader />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
