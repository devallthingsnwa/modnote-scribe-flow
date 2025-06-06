
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface ImportActionsProps {
  onClose: () => void;
  onImport: () => void;
  canImport: boolean;
  hasWarning: boolean;
}

export function ImportActions({ onClose, onImport, canImport, hasWarning }: ImportActionsProps) {
  return (
    <div className="flex justify-between">
      <Button 
        variant="outline" 
        onClick={onClose} 
        className="bg-[#2a2a2a] border-[#444] text-white hover:bg-[#3a3a3a]"
      >
        Cancel
      </Button>
      
      {canImport && (
        <Button onClick={onImport} className="bg-blue-600 hover:bg-blue-700 text-white">
          <FileText className="h-4 w-4 mr-2" />
          {hasWarning ? 'Save Note with Warning' : 'Import to Notes'}
        </Button>
      )}
    </div>
  );
}
