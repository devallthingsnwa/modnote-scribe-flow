import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Search, Play, Pause, FileText, Lightbulb, Clock, Hash, Copy, Share2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getYoutubeVideoId } from '@/lib/utils';
import { NoteGPTProcessor } from '@/components/notegpt/NoteGPTProcessor';
import { InteractiveTranscript } from '@/components/notegpt/InteractiveTranscript';

interface TranscriptEntry {
  text: string;
  duration: number;
  offset: number;
}

interface VideoInfo {
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  videoId: string;
}

export function YouTubeTranscriptExtractor() {
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'notes'>('transcript');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  
  const playerRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Fetch real video info from YouTube
  const fetchVideoInfo = async (videoId: string): Promise<VideoInfo> => {
    try {
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (!oembedResponse.ok) {
        throw new Error('Video not found or private');
      }
      
      const oembedData = await oembedResponse.json();
      
      return {
        title: oembedData.title,
        channel: oembedData.author_name,
        duration: 'Unknown',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        videoId: videoId
      };
    } catch (error) {
      throw new Error('Failed to fetch video information');
    }
  };

  // Fetch transcript using Supabase edge function
  const fetchRealTranscript = async (videoId: string): Promise<TranscriptEntry[]> => {
    try {
      const { data: transcriptResult, error: transcriptError } = await supabase.functions.invoke('fetch-youtube-transcript', {
        body: { 
          videoId,
          options: {
            includeTimestamps: true,
            language: 'en',
            maxRetries: 2
          }
        }
      });
      
      if (transcriptError) {
        throw new Error(`Function error: ${transcriptError.message}`);
      }
      
      if (!transcriptResult?.transcript) {
        throw new Error('No transcript data received');
      }

      // Parse the transcript into entries
      const transcriptText = transcriptResult.transcript;
      const entries: TranscriptEntry[] = [];
      
      // Parse format: [MM:SS - MM:SS] Text
      const timeRegex = /\[(\d{2}:\d{2}(?:\.\d{3})?)\s*-\s*(\d{2}:\d{2}(?:\.\d{3})?)\]\s*(.*?)(?=\[\d{2}:\d{2}|$)/gs;
      let match;
      
      while ((match = timeRegex.exec(transcriptText + " "))) {
        const startTimeStr = match[1];
        const endTimeStr = match[2];
        const text = match[3].trim();
        
        const startTime = parseTimeString(startTimeStr);
        const endTime = parseTimeString(endTimeStr);
        
        entries.push({
          text,
          offset: startTime,
          duration: endTime - startTime
        });
      }
      
      return entries.sort((a, b) => a.offset - b.offset);
      
    } catch (error) {
      console.error('Transcript fetch error:', error);
      throw new Error('Unable to fetch transcript. This video may not have captions available, or captions may be disabled.');
    }
  };

  const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) : 0;
    
    return minutes * 60 + seconds + (milliseconds / 1000);
  };

  // Main function to fetch transcript and video info
  const fetchTranscript = useCallback(async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const videoId = getYoutubeVideoId(videoUrl);
    if (!videoId) {
      setError('Invalid YouTube URL format');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript([]);
    setVideoInfo(null);

    try {
      // Fetch video info and transcript in parallel
      const [videoInfoData, transcriptData] = await Promise.all([
        fetchVideoInfo(videoId),
        fetchRealTranscript(videoId)
      ]);

      setVideoInfo(videoInfoData);
      setTranscript(transcriptData);
      
      toast({
        title: "Transcript extracted successfully!",
        description: `Found ${transcriptData.length} transcript segments.`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Failed to extract transcript",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [videoUrl, toast]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const jumpToTime = (time: number) => {
    setCurrentTime(time);
    if (playerRef.current) {
      console.log(`Jumping to time: ${formatTime(time)}`);
      toast({
        title: "Timestamp clicked",
        description: `Jumping to ${formatTime(time)}`,
      });
    }
  };

  const downloadTranscript = () => {
    const content = `# ${videoInfo?.title || 'YouTube Video Transcript'}
Channel: ${videoInfo?.channel || 'Unknown'}
Duration: ${videoInfo?.duration || 'Unknown'}
URL: ${videoUrl}

## Full Transcript
${transcript.map(entry => `[${formatTime(entry.offset)}] ${entry.text}`).join('\n')}

## Notes
${notes || 'No notes added'}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${videoInfo?.videoId || Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Transcript downloaded",
      description: "Your transcript has been saved as a markdown file.",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied successfully.",
    });
  };

  const clearAll = () => {
    setVideoUrl('');
    setTranscript([]);
    setVideoInfo(null);
    setError('');
    setSearchTerm('');
    setNotes('');
    setActiveTab('transcript');
  };

  const handleSaveComplete = (noteId: string) => {
    toast({
      title: "Success!",
      description: "Your transcript has been saved as a note. You can find it in your dashboard.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
            <FileText className="text-primary" size={40} />
            NoteGPT - AI YouTube Analyzer
          </h1>
          <p className="text-muted-foreground text-lg">Extract transcripts, generate AI summaries, and create smart notes from YouTube videos</p>
        </div>

        {/* Input Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste YouTube URL here (e.g., https://youtube.com/watch?v=dQw4w9WgXcQ)"
                  className="text-lg"
                  disabled={loading}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={fetchTranscript}
                  disabled={loading || !videoUrl.trim()}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Lightbulb size={20} />
                      Extract Transcript
                    </>
                  )}
                </Button>
                {(transcript.length > 0 || error) && (
                  <Button
                    onClick={clearAll}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex">
                <AlertCircle className="text-destructive mr-3 mt-0.5" size={20} />
                <div className="text-destructive">
                  <strong>Error:</strong> {error}
                  <p className="mt-2 text-sm">
                    Common issues: Video has no captions, captions are disabled, or the video is private/unavailable.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {videoInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Video Player & Info */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden sticky top-6">
                <div className="aspect-video bg-gray-900 relative">
                  <iframe
                    ref={playerRef}
                    src={`https://www.youtube.com/embed/${videoInfo.videoId}?enablejsapi=1`}
                    className="w-full h-full"
                    allowFullScreen
                    title="YouTube video player"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{videoInfo.title}</h3>
                  <p className="text-muted-foreground mb-2">{videoInfo.channel}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Hash size={16} />
                      {transcript.length} segments
                    </Badge>
                    {transcript.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock size={16} />
                        ~{Math.round(transcript[transcript.length - 1]?.offset / 60)} min
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-2">
              <Card>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="transcript" className="flex items-center gap-2">
                      <FileText size={18} />
                      Interactive Transcript
                      {transcript.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {transcript.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="flex items-center gap-2">
                      <Lightbulb size={18} />
                      AI Analysis
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-2">
                      <Hash size={18} />
                      My Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="transcript" className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <h2 className="text-xl font-bold">Interactive Video Transcript</h2>
                      <Button
                        onClick={downloadTranscript}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <Download size={18} />
                        Export Transcript
                      </Button>
                    </div>

                    <InteractiveTranscript
                      transcript={transcript}
                      videoId={videoInfo.videoId}
                      onTimestampClick={jumpToTime}
                    />
                  </TabsContent>

                  <TabsContent value="summary" className="p-6">
                    <h2 className="text-xl font-bold mb-6">AI-Powered Analysis</h2>
                    
                    {transcript.length > 0 ? (
                      <NoteGPTProcessor
                        videoId={videoInfo.videoId}
                        videoTitle={videoInfo.title}
                        videoUrl={videoUrl}
                        transcript={transcript.map(entry => `[${formatTime(entry.offset)}] ${entry.text}`).join('\n')}
                        onSaveComplete={handleSaveComplete}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        Extract transcript first to generate AI analysis
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="p-6">
                    <h2 className="text-xl font-bold mb-4">Personal Notes</h2>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your personal notes about this video..."
                      className="w-full h-64 p-4 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-background"
                    />
                    <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                      <span>{notes.length} characters</span>
                      <Button
                        variant="ghost"
                        onClick={() => copyToClipboard(notes)}
                        className="flex items-center gap-1"
                      >
                        <Copy size={16} />
                        Copy Notes
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
