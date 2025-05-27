
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileText, Clock } from "lucide-react";

interface TranscriptPreviewProps {
  transcript: string | null;
}

export function TranscriptPreview({ transcript }: TranscriptPreviewProps) {
  if (!transcript) {
    return (
      <Card className="p-6 bg-muted/20 border-dashed">
        <div className="text-center space-y-2">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No transcript available</p>
        </div>
      </Card>
    );
  }
  
  const lines = transcript.split('\n').filter(line => line.trim());
  const displayLines = lines.slice(0, 15);
  const hasMoreLines = lines.length > 15;
  
  // Count timestamps to estimate transcript segments
  const timestampCount = transcript.match(/\[\d{2}:\d{2}/g)?.length || 0;
  const estimatedDuration = transcript.match(/\[(\d{2}:\d{2})/g)?.pop()?.match(/\d{2}:\d{2}/)?.[0];
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Transcript Preview</Label>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {timestampCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {timestampCount} segments
            </span>
          )}
          {estimatedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{estimatedDuration}
            </span>
          )}
        </div>
      </div>
      
      <Card className="p-3 bg-background border">
        <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-1">
          {displayLines.map((line, index) => (
            <div 
              key={index} 
              className={`leading-relaxed ${
                line.startsWith('[') && line.includes(']') 
                  ? 'text-primary font-medium' 
                  : 'text-foreground'
              }`}
            >
              {line}
            </div>
          ))}
          {hasMoreLines && (
            <div className="text-muted-foreground italic pt-2 border-t">
              ... and {lines.length - displayLines.length} more lines
            </div>
          )}
        </div>
      </Card>
      
      <p className="text-xs text-muted-foreground">
        {lines.length} total lines • Ready to be added to your note
      </p>
    </div>
  );
}
