
import { User, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoData {
  title: string;
  author: string;
  duration: number;
}

interface VideoPlayerInfoProps {
  videoData: VideoData | null;
  videoId: string;
}

export function VideoPlayerInfo({ videoData, videoId }: VideoPlayerInfoProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const openInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  if (!videoData) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-lg leading-tight text-foreground">
          {videoData.title}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{videoData.author}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {videoData.duration > 0 && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(videoData.duration)}</span>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openInYouTube}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              YouTube
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
