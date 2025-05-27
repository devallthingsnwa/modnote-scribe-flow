
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VideoPlayerErrorProps {
  onRetry: () => void;
  onOpenInYouTube: () => void;
}

export function VideoPlayerError({ onRetry, onOpenInYouTube }: VideoPlayerErrorProps) {
  return (
    <Card className="flex items-center justify-center h-64 bg-red-50 border-red-200 dark:bg-red-900/20">
      <div className="text-center space-y-3">
        <div className="bg-red-100 rounded-full p-4 dark:bg-red-900/50">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <p className="text-red-700 dark:text-red-300 font-medium">Failed to load video</p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            The video might be private, unavailable, or restricted
          </p>
          <div className="flex gap-2 mt-3 justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenInYouTube}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in YouTube
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
