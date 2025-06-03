
import { ModNoteSidebar } from "./ModNoteSidebar";

interface ModNoteLayoutProps {
  children: React.ReactNode;
  selectedSection?: string;
  onSectionChange?: (section: string) => void;
}

export function ModNoteLayout({ 
  children, 
  selectedSection = "notes", 
  onSectionChange = () => {} 
}: ModNoteLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <ModNoteSidebar 
        selectedSection={selectedSection}
        onSectionChange={onSectionChange}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
