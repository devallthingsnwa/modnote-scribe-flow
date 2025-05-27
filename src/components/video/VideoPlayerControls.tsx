
import { Badge } from "@/components/ui/badge";

interface VideoPlayerControlsProps {
  isPlaying: boolean;
  isReady: boolean;
}

export function VideoPlayerControls({ isPlaying, isReady }: VideoPlayerControlsProps) {
  if (!isReady) return null;

  return (
    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <Badge 
        variant={isPlaying ? "default" : "secondary"} 
        className={`${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700'} text-white`}
      >
        {isPlaying ? 'Playing' : 'Paused'}
      </Badge>
    </div>
  );
}
