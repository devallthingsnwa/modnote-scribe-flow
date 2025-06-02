
import { useState } from "react";

export function useDashboardSelection() {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedNoteIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedNoteIds.length > 0) {
      setSelectedNoteIds([]);
      setIsSelectMode(false);
    }
  };

  const handleNoteSelect = (
    noteId: string, 
    setSelectedNoteId: (id: string | null) => void,
    setShowNoteContent: (show: boolean) => void,
    isMobile: boolean
  ) => {
    if (isSelectMode) {
      setSelectedNoteIds(prev => 
        prev.includes(noteId) 
          ? prev.filter(id => id !== noteId)
          : [...prev, noteId]
      );
    } else {
      setSelectedNoteId(noteId);
      if (isMobile) {
        setShowNoteContent(true);
      }
    }
  };

  return {
    isSelectMode,
    selectedNoteIds,
    handleSelectModeToggle,
    handleBulkDelete,
    handleNoteSelect
  };
}
