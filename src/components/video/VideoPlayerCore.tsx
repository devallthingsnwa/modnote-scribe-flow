
import { useEffect } from "react";
import YouTube from "react-youtube";

interface VideoPlayerCoreProps {
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onReady?: () => void;
  onError?: (error: any) => void;
  onStateChange?: (state: any) => void;
  onTimeUpdate?: (time: number) => void;
  isReady: boolean;
  hasError: boolean;
  retryCount: number;
}

export function VideoPlayerCore({
  videoId,
  playerRef,
  onReady,
  onError,
  onStateChange,
  onTimeUpdate,
  isReady,
  hasError,
  retryCount
}: VideoPlayerCoreProps) {
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

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
      <YouTube 
        key={`${videoId}-${retryCount}`}
        videoId={videoId}
        opts={opts} 
        onReady={onReady}
        onStateChange={onStateChange}
        onError={onError}
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
    </div>
  );
}
