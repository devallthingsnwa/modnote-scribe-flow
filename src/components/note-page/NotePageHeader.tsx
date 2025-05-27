
import { ChevronLeft, ExternalLink, Save, Trash2, Play, FileText, Download, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NotePageHeaderProps {
  isLoading: boolean;
  note: any;
  isVideoNote: boolean;
  isVideoReady: boolean;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function NotePageHeader({
  isLoading,
  note,
  isVideoNote,
  isVideoReady,
  onBack,
  onSave,
  onDelete,
  onExport
}: NotePageHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              {isVideoNote && (
                <div className="bg-red-500/10 p-2 rounded-lg">
                  <Play className="h-4 w-4 text-red-500" />
                </div>
              )}
              
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {isLoading ? (
                    <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                  ) : (
                    note?.title || "Untitled Note"
                  )}
                </h1>
                
                {note?.source_url && (
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Video Note
                    </Badge>
                    <a 
                      href={note.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                    >
                      <Youtube className="h-3 w-3 mr-1" />
                      Watch on YouTube
                    </a>
                    {isVideoReady && (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        Video Ready
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isLoading && note && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onExport}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onSave}
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Note
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onDelete}
                  className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
