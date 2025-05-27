
import { Badge } from "@/components/ui/badge";

interface VideoPlayerStatusProps {
  isReady: boolean;
}

export function VideoPlayerStatus({ isReady }: VideoPlayerStatusProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
      <div className="text-xs text-muted-foreground">
        {isReady ? "Click transcript timestamps to jump to specific moments" : "Video player loading..."}
      </div>
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs">
          Interactive Player
        </Badge>
        {isReady && (
          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
            Ready
          </Badge>
        )}
      </div>
    </div>
  );
}
