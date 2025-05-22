
import { Label } from "@/components/ui/label";

interface TranscriptPreviewProps {
  transcript: string | null;
}

export function TranscriptPreview({ transcript }: TranscriptPreviewProps) {
  if (!transcript) return null;
  
  const lines = transcript.split('\n');
  const displayLines = lines.slice(0, 20);
  const hasMoreLines = lines.length > 20;
  
  return (
    <div className="flex flex-col gap-2">
      <Label>Transcript Preview</Label>
      <div className="p-3 bg-muted rounded-md border border-border overflow-y-auto max-h-48 text-xs font-mono">
        {displayLines.map((line, index) => (
          <div key={index} className="mb-1">{line}</div>
        ))}
        {hasMoreLines && (
          <div className="text-muted-foreground italic">
            (Showing first 20 lines of {lines.length} total lines)
          </div>
        )}
      </div>
    </div>
  );
}
