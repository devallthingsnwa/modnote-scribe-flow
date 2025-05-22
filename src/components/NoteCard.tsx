
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export interface NoteCardProps {
  id: string; // Changed from number to string to match our database IDs
  title: string;
  content: string;
  date: Date;
  tags: {
    id: string; // Changed from number to string
    name: string;
    color: string;
  }[];
  notebook?: {
    id: string; // Changed from number to string
    name: string;
  };
  thumbnail?: string;
  onClick?: () => void;
  className?: string;
}

export function NoteCard({
  id,
  title,
  content,
  date,
  tags,
  notebook,
  thumbnail,
  onClick,
  className,
}: NoteCardProps) {
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]",
        className
      )}
    >
      {thumbnail && (
        <div className="w-full h-32 overflow-hidden rounded-t-lg">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
        <CardDescription className="text-xs">
          {formatDistanceToNow(date, { addSuffix: true })}
          {notebook && ` • ${notebook.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-2">
        <p className="text-sm text-muted-foreground line-clamp-3">{content}</p>
      </CardContent>
      {tags.length > 0 && (
        <CardFooter className="p-4 pt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={cn(
                "modnote-tag",
                tag.color,
                "text-white bg-opacity-90"
              )}
            >
              {tag.name}
            </span>
          ))}
        </CardFooter>
      )}
    </Card>
  );
}
