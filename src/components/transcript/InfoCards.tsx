
import { AlertTriangle } from "lucide-react";

export function InfoCards() {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-amber-700 dark:text-amber-300">
        <p className="font-medium mb-1">Smart Fallback System:</p>
        <p>When transcripts aren't available, the system automatically creates a note with a warning message, so you can still save and organize your video references.</p>
      </div>
    </div>
  );
}
