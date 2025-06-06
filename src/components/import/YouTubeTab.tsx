
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Video } from "lucide-react";

interface YouTubeTabProps {
  url: string;
  setUrl: (url: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
}

export function YouTubeTab({ url, setUrl, onProcess, isProcessing }: YouTubeTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 text-white">YouTube URL</label>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-[#1c1c1c] border-[#333] text-white placeholder-gray-400 focus:border-[#555]"
          />
          <Button
            onClick={onProcess}
            disabled={isProcessing || !url.trim()}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white border-0 whitespace-nowrap"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Extract from YouTube
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
