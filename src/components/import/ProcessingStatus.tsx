
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface ProcessingStatusProps {
  currentStep: string;
  progress: number;
}

export function ProcessingStatus({ currentStep, progress }: ProcessingStatusProps) {
  if (currentStep === "processing") {
    return (
      <div className="flex flex-col gap-2">
        <Label>Importing Content</Label>
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processing transcript...</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (currentStep === "complete") {
    return (
      <div className="flex flex-col gap-2">
        <Label>Import Complete</Label>
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-green-600 dark:text-green-400 text-sm">
          Content has been imported and saved to your notes!
        </div>
      </div>
    );
  }
  
  return null;
}
