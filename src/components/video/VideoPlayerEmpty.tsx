
import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";

export function VideoPlayerEmpty() {
  return (
    <Card className="flex items-center justify-center h-64 bg-muted/30 border-dashed">
      <div className="text-center space-y-3">
        <div className="bg-muted rounded-full p-4">
          <Play className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No video ID provided</p>
      </div>
    </Card>
  );
}
