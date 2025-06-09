
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Link } from "lucide-react";

interface UrlTabProps {
  url: string;
  setUrl: (url: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
}

export function UrlTab({ url, setUrl, onProcess, isProcessing }: UrlTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 text-white">Website URL</label>
        <Input
          placeholder="https://example.com/article..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mb-4 bg-[#1c1c1c] border-[#333] text-white placeholder-gray-400 focus:border-[#555]"
        />
        <Button
          onClick={onProcess}
          disabled={isProcessing || !url.trim()}
          className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border-[#333]"
        >
          {isProcessing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Link className="h-4 w-4 mr-2" />
              Extract from URL
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
