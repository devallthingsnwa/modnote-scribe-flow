
import { useEffect, useState } from "react";
import { VideoPlayerCore } from "./VideoPlayerCore";
import { VideoPlayerControls } from "./VideoPlayerControls";
import { VideoPlayerInfo } from "./VideoPlayerInfo";
import { VideoPlayerStatus } from "./VideoPlayerStatus";
import { VideoPlayerError } from "./VideoPlayerError";
import { VideoPlayerEmpty } from "./VideoPlayerEmpty";

interface VideoPlayerProps {
  videoId: string;
  playerRef: React.MutableRefObject<any>;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
}

interface VideoData {
  title: string;
  author: string;
  duration: number;
}

export function VideoPlayer({ videoId, playerRef, onTimeUpdate, onReady }: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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

  if (!videoId) {
    return <VideoPlayerEmpty />;
  }

  if (hasError) {
    return (
      <VideoPlayerError 
        onRetry={retryLoad}
        onOpenInYouTube={openInYouTube}
      />
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Video Player Container */}
      <div className="relative group">
        <VideoPlayerCore
          videoId={videoId}
          playerRef={playerRef}
          onReady={onPlayerReady}
          onError={onPlayerError}
          onStateChange={onPlayerStateChange}
          onTimeUpdate={onTimeUpdate}
          isReady={isReady}
          hasError={hasError}
          retryCount={retryCount}
        />
        
        <VideoPlayerControls 
          isPlaying={isPlaying}
          isReady={isReady}
        />
      </div>
      
      {/* Video Info */}
      <VideoPlayerInfo 
        videoData={videoData}
        videoId={videoId}
      />
      
      {/* Player Status Info */}
      <VideoPlayerStatus isReady={isReady} />
    </div>
  );
}
