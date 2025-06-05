
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link, Video } from "lucide-react";

interface UrlInputProps {
  url: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFetchPreview: () => void;
  isLoading: boolean;
  disabled: boolean;
  buttonText?: string;
}

export function UrlInput({ 
  url, 
  onChange, 
  onFetchPreview, 
  isLoading, 
  disabled,
  buttonText = "Preview"
}: UrlInputProps) {
  const isYouTubeUrl = url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="https://youtube.com/watch?v=... or any URL"
          value={url}
          onChange={onChange}
          className="flex-1"
          disabled={disabled}
        />
        <Button
          onClick={onFetchPreview}
          disabled={isLoading || !url.trim() || disabled}
          className="whitespace-nowrap min-w-[100px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              {isYouTubeUrl ? (
                <Video className="h-4 w-4 mr-2" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              {buttonText}
            </>
          )}
        </Button>
      </div>
      
      {isYouTubeUrl && url && (
        <p className="text-xs text-muted-foreground">
          📹 YouTube video detected - will extract title, metadata, and transcript automatically
        </p>
      )}
    </div>
  );
}
