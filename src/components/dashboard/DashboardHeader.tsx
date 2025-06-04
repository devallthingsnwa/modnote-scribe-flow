
interface DashboardHeaderProps {
  onImportClick: () => void;
}

export function DashboardHeader({ onImportClick }: DashboardHeaderProps) {
  return (
    <header className="border-b p-4 bg-[#0f0f0f] border-gray-800">
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-2xl font-semibold text-white">Notes</h1>
        <div className="flex space-x-2">
          <button 
            onClick={onImportClick}
            className="mobile-ghost-button"
          >
            Import
          </button>
        </div>
      </div>
    </header>
  );
}
