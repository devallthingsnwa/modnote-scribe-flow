
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Search, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptEntry {
  text: string;
  duration: number;
  offset: number;
}

interface InteractiveTranscriptProps {
  transcript: TranscriptEntry[];
  videoId: string;
  onTimestampClick?: (time: number) => void;
}

export function InteractiveTranscript({ 
  transcript, 
  videoId, 
  onTimestampClick 
}: InteractiveTranscriptProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { toast } = useToast();
  const transcriptRefs = useRef<(HTMLDivElement | null)[]>([]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredTranscript = transcript.filter(entry =>
    entry.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTimestampClick = (time: number, index: number) => {
    setHighlightedIndex(index);
    onTimestampClick?.(time);
    
    // Scroll to the clicked entry
    setTimeout(() => {
      transcriptRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 100);

    toast({
      title: "Timestamp Clicked",
      description: `Jumping to ${formatTime(time)}`,
    });
  };

  const copyTranscriptEntry = (text: string, time: number) => {
    const formattedEntry = `[${formatTime(time)}] ${text}`;
    navigator.clipboard.writeText(formattedEntry);
    toast({
      title: "Copied to clipboard",
      description: "Transcript entry with timestamp copied.",
    });
  };

  const copyFullTranscript = () => {
    const fullText = transcript
      .map(entry => `[${formatTime(entry.offset)}] ${entry.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    toast({
      title: "Full transcript copied",
      description: "The complete transcript has been copied to clipboard.",
    });
  };

  const openInYouTube = (time: number) => {
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(time)}s`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    // Reset highlighted index when search changes
    setHighlightedIndex(-1);
  }, [searchTerm]);

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transcript..."
            className="pl-10"
          />
        </div>
        <Button 
          onClick={copyFullTranscript}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          Copy All
        </Button>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="text-sm text-muted-foreground">
          {filteredTranscript.length > 0 
            ? `Found ${filteredTranscript.length} result${filteredTranscript.length !== 1 ? 's' : ''} for "${searchTerm}"`
            : `No results found for "${searchTerm}"`
          }
        </div>
      )}

      {/* Transcript Entries */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {(filteredTranscript.length > 0 ? filteredTranscript : transcript).map((entry, index) => {
          const isHighlighted = highlightedIndex === index;
          const hasSearchMatch = searchTerm && entry.text.toLowerCase().includes(searchTerm.toLowerCase());
          
          return (
            <Card
              key={`${entry.offset}-${index}`}
              ref={el => transcriptRefs.current[index] = el}
              className={`transition-all duration-200 hover:shadow-md cursor-pointer group ${
                isHighlighted ? 'ring-2 ring-primary bg-primary/5' : ''
              } ${hasSearchMatch ? 'bg-yellow-50 border-yellow-200' : ''}`}
              onClick={() => handleTimestampClick(entry.offset, index)}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Timestamp Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-shrink-0 gap-1 h-8 text-xs font-mono"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimestampClick(entry.offset, index);
                    }}
                  >
                    <Play className="h-3 w-3" />
                    {formatTime(entry.offset)}
                  </Button>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      {searchTerm ? (
                        entry.text.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
                          part.toLowerCase() === searchTerm.toLowerCase() ? (
                            <mark key={i} className="bg-yellow-300 px-1 rounded">
                              {part}
                            </mark>
                          ) : (
                            part
                          )
                        )
                      ) : (
                        entry.text
                      )}
                    </p>
                    
                    {/* Duration info */}
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.duration.toFixed(1)}s duration
                      </Badge>
                      
                      {/* Action buttons (shown on hover) */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyTranscriptEntry(entry.text, entry.offset);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInYouTube(entry.offset);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {transcript.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No transcript available</p>
        </div>
      )}
    </div>
  );
}
