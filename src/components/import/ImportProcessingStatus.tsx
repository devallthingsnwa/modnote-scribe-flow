
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface ImportProcessingStatusProps {
  isProcessing: boolean;
  progress: number;
  status: string;
  hasWarning: boolean;
  transcript: string | null;
}

export function ImportProcessingStatus({ 
  isProcessing, 
  progress, 
  status, 
  hasWarning, 
  transcript 
}: ImportProcessingStatusProps) {
  return (
    <>
      {/* Processing Status */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-white">
            <Clock className="h-4 w-4 animate-spin" />
            <span>{status}</span>
          </div>
          <Progress value={progress} className="w-full bg-[#2a2a2a]" />
        </div>
      )}

      {/* Success Status */}
      {!isProcessing && transcript && (
        <div className={`flex items-center gap-2 text-sm ${hasWarning ? 'text-orange-400' : 'text-green-400'}`}>
          {hasWarning ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span>{status}</span>
        </div>
      )}
    </>
  );
}
