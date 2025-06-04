
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptPreviewProps {
  extractedTranscript: string;
  videoInfo: any;
  hasWarning: boolean;
}

export function TranscriptPreview({ extractedTranscript, videoInfo, hasWarning }: TranscriptPreviewProps) {
  const { toast } = useToast();

  const downloadTranscript = () => {
    if (!extractedTranscript) return;

    const content = `# ${videoInfo?.title || 'YouTube Video Transcript'}
Author: ${videoInfo?.author || 'Unknown'}
Duration: ${videoInfo?.duration || 'Unknown'}
Extracted: ${new Date().toLocaleString()}
${hasWarning ? 'Status: ⚠️ Transcript unavailable - manual notes only' : ''}

## ${hasWarning ? 'Notes' : 'Transcript'}
${extractedTranscript}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hasWarning ? 'notes' : 'transcript'}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: `${hasWarning ? 'Notes' : 'Transcript'} downloaded`,
      description: `Your ${hasWarning ? 'notes' : 'transcript'} has been saved as a text file.`
    });
  };

  if (!extractedTranscript) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {hasWarning ? 'Video Note Preview' : 'Transcript Preview'}
        </span>
        <Button
          onClick={downloadTranscript}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>
      
      {videoInfo && (
        <div className={`p-3 rounded-lg border ${hasWarning ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-muted/50'}`}>
          <h4 className="font-medium text-sm truncate">{videoInfo.title}</h4>
          <p className="text-xs text-muted-foreground">
            by {videoInfo.author} • {videoInfo.duration}
          </p>
          {hasWarning && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              ⚠️ Transcript unavailable - note created for manual input
            </p>
          )}
        </div>
      )}

      <div className="max-h-32 overflow-y-auto p-3 bg-muted/20 rounded-lg border text-xs font-mono">
        {extractedTranscript.split('\n').slice(0, 10).map((line, index) => (
          <div key={index} className="mb-1">{line}</div>
        ))}
        {extractedTranscript.split('\n').length > 10 && (
          <div className="text-muted-foreground italic">
            ... and {extractedTranscript.split('\n').length - 10} more lines
          </div>
        )}
      </div>
    </div>
  );
}
