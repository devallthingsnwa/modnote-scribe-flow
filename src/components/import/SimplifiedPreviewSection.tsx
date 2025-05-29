
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, User, Video } from "lucide-react";
import { TranscriptPreview } from "./TranscriptPreview";

interface SimplifiedPreviewSectionProps {
  metadata: {
    title?: string;
    author?: string;
    duration?: string;
    thumbnail?: string;
    description?: string;
  };
  transcript: string | null;
  contentType: string;
}

export function SimplifiedPreviewSection({ 
  metadata, 
  transcript, 
  contentType 
}: SimplifiedPreviewSectionProps) {
  return (
    <div className="space-y-4">
      {/* Content Metadata */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {contentType === 'youtube' ? (
                <Video className="h-5 w-5 text-red-500" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
              Content Preview
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {metadata.thumbnail && (
            <div className="flex justify-center">
              <img 
                src={metadata.thumbnail} 
                alt="Content thumbnail"
                className="max-w-full h-32 object-cover rounded-lg border"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">
              {metadata.title || 'Untitled Content'}
            </h3>
            
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {metadata.author && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{metadata.author}</span>
                </div>
              )}
              {metadata.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{metadata.duration}</span>
                </div>
              )}
            </div>
            
            {metadata.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {metadata.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Transcript Preview - Core Focus */}
      <TranscriptPreview transcript={transcript} />
    </div>
  );
}
