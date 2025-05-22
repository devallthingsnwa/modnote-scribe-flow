
import { Label } from "@/components/ui/label";

interface PreviewSectionProps {
  thumbnail: string | null;
}

export function PreviewSection({ thumbnail }: PreviewSectionProps) {
  if (!thumbnail) return null;
  
  return (
    <div className="flex flex-col gap-2">
      <Label>Preview</Label>
      <div className="overflow-hidden rounded-md border border-border">
        <img 
          src={thumbnail} 
          alt="Content preview" 
          className="w-full h-auto object-cover" 
        />
      </div>
    </div>
  );
}
