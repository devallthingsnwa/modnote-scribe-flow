
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">No transcript available for this video.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search transcript..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredSegments.length > 0 ? (
          filteredSegments.map((segment, index) => {
            const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
            
            return (
              <div 
                key={index}
                className={`p-2 rounded-md transition-colors ${isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted/50'}`}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs font-mono mb-1"
                  onClick={() => onTimestampClick && onTimestampClick(segment.startTime)}
                >
                  {formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)}
                </Button>
                <p className={isActive ? 'font-medium' : ''}>{segment.text}</p>
              </div>
            );
          })
        ) : searchTerm ? (
          <div className="text-center p-4 text-muted-foreground">
            No matching transcript segments found.
          </div>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            This transcript doesn't contain proper timestamps.
          </div>
        )}
      </div>
    </div>
  );
}
