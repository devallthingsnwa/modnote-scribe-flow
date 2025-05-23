
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Clock, Play, MessageSquare } from "lucide-react";

interface TranscriptPanelProps {
  transcript: string;
  currentTime?: number;
  onTimestampClick?: (timestamp: number) => void;
}

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export function TranscriptPanel({ transcript, currentTime = 0, onTimestampClick }: TranscriptPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const transcriptSegments = useMemo(() => {
    if (!transcript) return [];
    
    // Parse transcript with timestamps
    // Format: [MM:SS - MM:SS] Text
    const regex = /\[(\d{2}:\d{2}) - (\d{2}:\d{2})\] (.*?)(?=\[\d{2}:\d{2} - \d{2}:\d{2}\]|$)/gs;
    const segments: TranscriptSegment[] = [];
    
    let match;
    while ((match = regex.exec(transcript + " "))) { // Add space to catch the last segment
      const startTimeStr = match[1];
      const endTimeStr = match[2];
      const text = match[3].trim();
      
      // Convert MM:SS to seconds
      const startTimeParts = startTimeStr.split(':');
      const endTimeParts = endTimeStr.split(':');
      
      const startTime = parseInt(startTimeParts[0], 10) * 60 + parseInt(startTimeParts[1], 10);
      const endTime = parseInt(endTimeParts[0], 10) * 60 + parseInt(endTimeParts[1], 10);
      
      segments.push({ startTime, endTime, text });
    }
    
    return segments;
  }, [transcript]);
  
  const filteredSegments = useMemo(() => {
    if (!searchTerm) return transcriptSegments;
    return transcriptSegments.filter(segment => 
      segment.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transcriptSegments, searchTerm]);
  
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  if (!transcript) {
    return (
      <Card className="flex flex-col items-center justify-center h-64 bg-muted/20 border-dashed">
        <div className="text-center space-y-4">
          <div className="bg-muted rounded-full p-6">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground font-medium">No transcript available</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Transcript will appear here when available
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Transcript</span>
            <Badge variant="secondary" className="text-xs">
              {transcriptSegments.length} segments
            </Badge>
          </div>
          {currentTime > 0 && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimestamp(currentTime)}
            </Badge>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search in transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
          />
        </div>
      </div>
      
      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredSegments.length > 0 ? (
          <div className="space-y-2">
            {filteredSegments.map((segment, index) => {
              const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
              const isPast = currentTime > segment.endTime;
              
              return (
                <Card 
                  key={index}
                  className={`p-4 transition-all duration-300 cursor-pointer hover:shadow-md border ${
                    isActive 
                      ? 'bg-primary/10 border-primary/30 shadow-md scale-[1.02]' 
                      : isPast
                      ? 'bg-muted/30 border-border/30'
                      : 'bg-background/80 border-border/50 hover:bg-muted/20'
                  }`}
                  onClick={() => onTimestampClick && onTimestampClick(segment.startTime)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`text-xs font-mono h-6 px-2 ${
                          isActive 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTimestampClick && onTimestampClick(segment.startTime);
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {formatTimestamp(segment.startTime)}
                      </Button>
                      
                      {isActive && (
                        <Badge variant="default" className="text-xs bg-primary">
                          <div className="h-2 w-2 bg-white rounded-full animate-pulse mr-1" />
                          Playing
                        </Badge>
                      )}
                    </div>
                    
                    <p className={`text-sm leading-relaxed ${
                      isActive 
                        ? 'font-medium text-foreground' 
                        : isPast
                        ? 'text-muted-foreground'
                        : 'text-foreground'
                    }`}>
                      {searchTerm ? (
                        segment.text.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === searchTerm.toLowerCase() ? (
                            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                              {part}
                            </mark>
                          ) : part
                        )
                      ) : (
                        segment.text
                      )}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : searchTerm ? (
          <Card className="p-6 text-center bg-muted/20 border-dashed">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No matching segments found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Try different keywords or clear the search
            </p>
          </Card>
        ) : (
          <Card className="p-6 text-center bg-muted/20 border-dashed">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No timestamps in transcript</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              This transcript doesn't contain proper timestamps
            </p>
          </Card>
        )}
      </div>
      
      {/* Footer Info */}
      {filteredSegments.length > 0 && (
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {searchTerm ? `${filteredSegments.length} of ${transcriptSegments.length}` : `${transcriptSegments.length}`} segments
            </span>
            <span>Click any timestamp to jump to that moment</span>
          </div>
        </div>
      )}
    </div>
  );
}
