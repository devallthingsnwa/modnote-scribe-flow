
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface UrlInputProps {
  url: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFetchPreview: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export function UrlInput({ url, onChange, onFetchPreview, isLoading, disabled }: UrlInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        id="url"
        placeholder="https://youtube.com/watch?v=..."
        value={url}
        onChange={onChange}
        className="flex-1"
      />
      <Button
        type="button" 
        variant="secondary"
        onClick={onFetchPreview}
        disabled={!url || isLoading || disabled}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Preview"
        )}
      </Button>
    </div>
  );
}
