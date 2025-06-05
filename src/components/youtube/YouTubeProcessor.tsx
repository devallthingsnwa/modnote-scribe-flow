
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Download, Play, Clock, User, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { YouTubeTranscriptService } from '@/lib/youtube/transcriptService';
import { TranscriptResult } from '@/lib/youtube/types';

interface YouTubeProcessorProps {
  onTranscriptExtracted?: (result: TranscriptResult) => void;
}

export function YouTubeProcessor({ onTranscriptExtracted }: YouTubeProcessorProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const { toast } = useToast();

  const handleProcess = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProcessingStatus('Initializing transcript extraction...');

    try {
      // Add status updates
      const statusInterval = setInterval(() => {
        setProcessingStatus(prev => {
          if (prev.includes('Initializing')) {
            return 'Checking for available captions...';
          } else if (prev.includes('Checking')) {
            return 'Processing audio transcription...';
          } else {
            return 'Finalizing transcript...';
          }
        });
      }, 3000);

      const transcriptResult = await YouTubeTranscriptService.processVideoWithRetry(videoUrl, 2);
      
      clearInterval(statusInterval);
      setResult(transcriptResult);
      
      if (transcriptResult.success) {
        const sourceLabel = transcriptResult.source === 'captions' ? 'captions' : 'audio transcription';
        toast({
          title: "✅ Transcript extracted successfully!",
          description: `Extracted via ${sourceLabel} (${transcriptResult.transcript?.length || 0} characters)`,
        });
        onTranscriptExtracted?.(transcriptResult);
      } else {
        toast({
          title: "❌ Transcript extraction failed",
          description: transcriptResult.error || "Unable to extract transcript",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Processing error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const downloadTranscript = () => {
    if (!result?.transcript) return;

    const content = `# ${result.metadata?.title || 'YouTube Video Transcript'}
Channel: ${result.metadata?.channel || 'Unknown'}
Duration: ${result.metadata?.duration || 'Unknown'}
Source: ${result.source}
URL: ${videoUrl}

${result.transcript}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${result.metadata?.videoId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'captions': return 'default';
      case 'audio-transcription': return 'secondary';
      default: return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Smart YouTube Transcript Extractor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button 
              onClick={handleProcess}
              disabled={isProcessing || !videoUrl.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Extract
                </>
              )}
            </Button>
          </div>

          {processingStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {processingStatus}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            💡 <strong>Smart extraction:</strong> First tries captions, then falls back to audio transcription
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {result.metadata?.title || 'YouTube Video'}
                </CardTitle>
                {result.metadata && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {result.metadata.channel}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {result.metadata.duration}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSourceBadgeVariant(result.source)}>
                  {result.source === 'captions' ? '📝 Captions' : 
                   result.source === 'audio-transcription' ? '🎵 Audio' : '❌ Failed'}
                </Badge>
                {result.success && (
                  <Button onClick={downloadTranscript} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {result.success && result.transcript ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">
                    {result.transcript.length} characters
                  </Badge>
                  {result.segments && (
                    <Badge variant="outline">
                      {result.segments.length} segments
                    </Badge>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto bg-muted/30 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {result.transcript}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-destructive mb-2">❌ Extraction Failed</div>
                <p className="text-sm text-muted-foreground">
                  {result.error || 'Unable to extract transcript'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
