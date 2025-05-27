
import { useEffect, useState } from "react";
import YouTube from "react-youtube";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Play, User, Clock, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
}

export function VideoPlayer({ videoId, playerRef, onTimeUpdate, onReady }: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
      origin: window.location.origin
    },
  };

  const onPlayerReady = (event: any) => {
    console.log("YouTube player ready for video:", videoId);
    playerRef.current = event.target;
    setIsReady(true);
    setHasError(false);
    
    // Get video info with enhanced error handling
    try {
      const videoInfo = playerRef.current.getVideoData();
      const duration = playerRef.current.getDuration();
      
      // Use the actual video title from YouTube API if available
      const actualTitle = videoInfo.title || `YouTube Video ${videoId}`;
      const actualAuthor = videoInfo.author || 'Unknown';
      
      setVideoData({ 
        title: actualTitle,
        author: actualAuthor,
        duration: duration || 0
      });
      
      console.log("Video data loaded:", { 
        title: actualTitle, 
        author: actualAuthor, 
        duration,
        videoId 
      });
      onReady?.();
    } catch (error) {
      console.error("Error getting video data:", error);
      // Fallback data
      setVideoData({ 
        title: `YouTube Video ${videoId}`,
        author: 'Unknown',
        duration: 0
      });
      onReady?.();
    }
  };

  const onPlayerStateChange = (event: any) => {
    const playerStates = {
      '-1': 'unstarted',
      '0': 'ended',
      '1': 'playing',
      '2': 'paused',
      '3': 'buffering',
      '5': 'cued'
    };
    
    setIsPlaying(event.data === 1);
    console.log(`Player state changed to: ${playerStates[event.data] || event.data}`);
  };

  const onPlayerError = (event: any) => {
    const errorMessages = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Video not allowed in embedded players',
      150: 'Video not allowed in embedded players'
    };
    
    const errorMessage = errorMessages[event.data] || `Unknown error (${event.data})`;
    console.error("YouTube player error:", errorMessage);
    setHasError(true);
    setIsReady(false);
  };

  const retryLoad = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsReady(false);
  };

  const openInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  // Handle timestamp jumping
  const seekTo = (timestamp: number) => {
    if (playerRef.current && isReady) {
      try {
        playerRef.current.seekTo(timestamp);
        console.log(`Seeking to timestamp: ${timestamp}s`);
      } catch (error) {
        console.error("Error seeking to timestamp:", error);
      }
    }
  };

  useEffect(() => {
    if (!isReady || !playerRef.current || !onTimeUpdate) return;

    const interval = setInterval(() => {
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const currentTime = playerRef.current.getCurrentTime();
          onTimeUpdate(currentTime);
        }
      } catch (error) {
        console.error("Error getting current time:", error);
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

  if (hasError) {
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
                onClick={retryLoad}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openInYouTube}
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

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Video Player Container */}
      <div className="relative group">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
          <YouTube 
            key={`${videoId}-${retryCount}`}
            videoId={videoId}
            opts={opts} 
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            onError={onPlayerError}
            className="absolute inset-0 h-full w-full"
          />
          
          {/* Loading Overlay */}
          {!isReady && !hasError && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white text-sm">Loading video player...</p>
              </div>
            </div>
          )}
          
          {/* Play Status Indicator */}
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
          
          {/* Player Status Info */}
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
        </div>
      )}
    </div>
  );
}
