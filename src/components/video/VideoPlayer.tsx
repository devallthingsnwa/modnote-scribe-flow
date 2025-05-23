
import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Play, User, Clock } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onTimeUpdate?: (time: number) => void;
}

export function VideoPlayer({ videoId, playerRef, onTimeUpdate }: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      controls: 1,
      disablekb: 0,
      enablejsapi: 1,
    },
  };

  const onReady = (event: any) => {
    playerRef.current = event.target;
    setIsReady(true);
    
    // Get video info
    const title = playerRef.current.getVideoData().title;
    const author = playerRef.current.getVideoData().author;
    const duration = playerRef.current.getDuration();
    setVideoData({ title, author, duration });
  };

  const onStateChange = (event: any) => {
    // YouTube player state: 1 = playing, 2 = paused
    setIsPlaying(event.data === 1);
  };

  useEffect(() => {
    if (!isReady || !playerRef.current || !onTimeUpdate) return;

    // Update time every second
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdate(currentTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, playerRef, onTimeUpdate]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoId) {
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

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Video Player Container */}
      <div className="relative group">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
          <YouTube 
            videoId={videoId}
            opts={opts} 
            onReady={onReady}
            onStateChange={onStateChange}
            className="absolute inset-0 h-full w-full"
          />
          
          {/* Loading Overlay */}
          {!isReady && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white text-sm">Loading video...</p>
              </div>
            </div>
          )}
          
          {/* Status Indicator */}
          {isReady && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Badge 
                variant={isPlaying ? "default" : "secondary"} 
                className={`${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700'} text-white`}
              >
                {isPlaying ? 'Playing' : 'Paused'}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      {/* Video Info */}
      {videoData && (
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
              
              {videoData.duration && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(videoData.duration)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Video Controls Info */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground">
              Click on transcript timestamps to jump to specific moments
            </div>
            <Badge variant="outline" className="text-xs">
              Interactive
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
