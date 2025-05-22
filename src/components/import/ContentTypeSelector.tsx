
import { Button } from "@/components/ui/button";
import { Video, Mic, FileText } from "lucide-react";

interface ContentTypeSelectorProps {
  type: "video" | "audio" | "text";
  setType: (type: "video" | "audio" | "text") => void;
}

export function ContentTypeSelector({ type, setType }: ContentTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={type === "video" ? "default" : "outline"}
        onClick={() => setType("video")}
        className="flex gap-2"
      >
        <Video className="h-4 w-4" />
        <span>Video</span>
      </Button>
      <Button
        type="button"
        variant={type === "audio" ? "default" : "outline"}
        onClick={() => setType("audio")}
        className="flex gap-2"
      >
        <Mic className="h-4 w-4" />
        <span>Audio</span>
      </Button>
      <Button
        type="button"
        variant={type === "text" ? "default" : "outline"}
        onClick={() => setType("text")}
        className="flex gap-2"
      >
        <FileText className="h-4 w-4" />
        <span>Text</span>
      </Button>
    </div>
  );
}
