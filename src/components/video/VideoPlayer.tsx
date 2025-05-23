
import { useEffect, useState } from "react";
import YouTube from "react-youtube";

interface VideoPlayerProps {
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onTimeUpdate?: (time: number) => void;
}

export function VideoPlayer({ videoId, playerRef, onTimeUpdate }: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
    },
  };

  const onReady = (event: any) => {
    playerRef.current = event.target;
    setIsReady(true);
    
    // Get video info
    const title = playerRef.current.getVideoData().title;
    const author = playerRef.current.getVideoData().author;
    setVideoData({ title, author });
  };

  useEffect(() => {
    if (!isReady || !playerRef.current || !onTimeUpdate) return;

    // Update time every second
    const interval = setInterval(() => {
      const currentTime = playerRef.current.getCurrentTime();
      onTimeUpdate(currentTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, playerRef, onTimeUpdate]);

  if (!videoId) {
    return <div className="flex items-center justify-center h-64">No video ID provided</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-md">
        <YouTube 
          videoId={videoId}
          opts={opts} 
          onReady={onReady}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      
      {videoData && (
        <div className="mt-4">
          <h3 className="font-medium">{videoData.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{videoData.author}</p>
        </div>
      )}
    </div>
  );
}
