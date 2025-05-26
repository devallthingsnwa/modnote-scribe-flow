
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Clock, Play, MessageSquare, User } from "lucide-react";

interface TranscriptPanelProps {
  transcript: string;
  currentTime?: number;
  onTimestampClick?: (timestamp: number) => void;
}

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export function TranscriptPanel({ transcript, currentTime = 0, onTimestampClick }: TranscriptPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const transcriptSegments = useMemo(() => {
    if (!transcript) return [];
    
    // Enhanced parsing for multiple formats with speaker metadata
    const segments: TranscriptSegment[] = [];
    
    // Format 1: [MM:SS - MM:SS] Speaker: Text
    const speakerRegex = /\[(\d{2}:\d{2}(?:\.\d{3})?)\s*-\s*(\d{2}:\d{2}(?:\.\d{3})?)\]\s*([^:]+):\s*(.*?)(?=\[\d{2}:\d{2}|$)/gs;
    
    // Format 2: [MM:SS - MM:SS] Text (without speaker)
    const basicRegex = /\[(\d{2}:\d{2}(?:\.\d{3})?)\s*-\s*(\d{2}:\d{2}(?:\.\d{3})?)\]\s*(.*?)(?=\[\d{2}:\d{2}|$)/gs;
    
    let match;
    
    // Try speaker format first
    while ((match = speakerRegex.exec(transcript + " "))) {
      const startTimeStr = match[1];
      const endTimeStr = match[2];
      const speaker = match[3].trim();
      const text = match[4].trim();
      
      const startTime = parseTimeString(startTimeStr);
      const endTime = parseTimeString(endTimeStr);
      
      segments.push({ 
        startTime, 
        endTime, 
        text, 
        speaker: speaker !== 'Unknown' ? speaker : undefined 
      });
    }
    
    // If no speaker segments found, try basic format
    if (segments.length === 0) {
      while ((match = basicRegex.exec(transcript + " "))) {
        const startTimeStr = match[1];
        const endTimeStr = match[2];
        const text = match[3].trim();
        
        const startTime = parseTimeString(startTimeStr);
        const endTime = parseTimeString(endTimeStr);
        
        segments.push({ startTime, endTime, text });
      }
    }
    
    return segments.sort((a, b) => a.startTime - b.startTime);
  }, [transcript]);
  
  const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) : 0;
    
    return minutes * 60 + seconds + (milliseconds / 1000);
  };
  
  const filteredSegments = useMemo(() => {
    if (!searchTerm) return transcriptSegments;
    return transcriptSegments.filter(segment => 
      segment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (segment.speaker && segment.speaker.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [transcriptSegments, searchTerm]);
  
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    if (milliseconds > 0) {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getSpeakerColor = (speaker: string | undefined): string => {
    if (!speaker) return 'bg-gray-500';
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-orange-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
      hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
  
  const uniqueSpeakers = [...new Set(transcriptSegments.map(s => s.speaker).filter(Boolean))];
  
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Enhanced Search Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Interactive Transcript</span>
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
        
        {/* Speaker Legend */}
        {uniqueSpeakers.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-lg border">
            <div className="text-xs text-muted-foreground mr-2">Speakers:</div>
            {uniqueSpeakers.map((speaker) => (
              <Badge key={speaker} variant="outline" className="text-xs">
                <div className={`w-2 h-2 rounded-full mr-1 ${getSpeakerColor(speaker)}`} />
                {speaker}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search in transcript or speaker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
          />
        </div>
      </div>
      
      {/* Enhanced Transcript Content */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filteredSegments.length > 0 ? (
          <div className="space-y-1">
            {filteredSegments.map((segment, index) => {
              const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
              const isPast = currentTime > segment.endTime;
              const duration = segment.endTime - segment.startTime;
              
              return (
                <Card 
                  key={index}
                  className={`p-3 transition-all duration-200 cursor-pointer hover:shadow-sm border ${
                    isActive 
                      ? 'bg-primary/10 border-primary/30 shadow-sm scale-[1.01]' 
                      : isPast
                      ? 'bg-muted/20 border-border/30'
                      : 'bg-background/80 border-border/50 hover:bg-muted/10'
                  }`}
                  onClick={() => onTimestampClick && onTimestampClick(segment.startTime)}
                >
                  <div className="space-y-2">
                    {/* Timestamp and Speaker Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
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
                        
                        {segment.speaker && (
                          <Badge variant="outline" className="text-xs">
                            <div className={`w-2 h-2 rounded-full mr-1 ${getSpeakerColor(segment.speaker)}`} />
                            {segment.speaker}
                          </Badge>
                        )}
                        
                        <span className="text-xs text-muted-foreground">
                          ({duration.toFixed(1)}s)
                        </span>
                      </div>
                      
                      {isActive && (
                        <Badge variant="default" className="text-xs bg-primary">
                          <div className="h-2 w-2 bg-white rounded-full animate-pulse mr-1" />
                          Playing
                        </Badge>
                      )}
                    </div>
                    
                    {/* Transcript Text */}
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
      
      {/* Enhanced Footer Info */}
      {filteredSegments.length > 0 && (
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span>
                {searchTerm ? `${filteredSegments.length} of ${transcriptSegments.length}` : `${transcriptSegments.length}`} segments
              </span>
              {uniqueSpeakers.length > 0 && (
                <span className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {uniqueSpeakers.length} speakers
                </span>
              )}
            </div>
            <span>Click any timestamp to jump to that moment</span>
          </div>
        </div>
      )}
    </div>
  );
}
