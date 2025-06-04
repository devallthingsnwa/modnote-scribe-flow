
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Youtube, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TranscriptionService } from '@/lib/transcriptionService';

interface YoutubeImportFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading: boolean;
}

export function YoutubeImportForm({ onContentImported, isLoading }: YoutubeImportFormProps) {
  const [url, setUrl] = useState('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessingStatus('Extracting video metadata...');
      setTranscriptionProgress(25);

      // Extract video ID and get metadata
      const videoId = TranscriptionService.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      const metadata = await TranscriptionService.getYouTubeMetadata(videoId);
      setProcessingStatus('Fetching transcript with fallback APIs...');
      setTranscriptionProgress(50);

      // Get transcription with fallback system
      const transcriptionResult = await TranscriptionService.transcribeWithFallback(url);
      
      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Transcription failed');
      }

      setProcessingStatus('Processing complete!');
      setTranscriptionProgress(100);

      const title = `🎥 ${metadata.title || `YouTube Video ${videoId}`}`;
      const importDate = new Date().toLocaleString();
      
      let content = `# ${title}\n\n`;
      content += `**Source:** ${url}\n`;
      content += `**Type:** Video Transcript\n`;
      content += `**Imported:** ${importDate}\n`;
      content += `\n---\n\n`;
      content += `## 📝 Transcript\n\n`;
      content += transcriptionResult.text;
      content += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;

      onContentImported({
        title,
        content,
        source_url: url,
        thumbnail: metadata.thumbnail,
        is_transcription: true
      });

      // Reset form
      setUrl('');
      setProcessingStatus('');
      setTranscriptionProgress(0);
      
      toast({
        title: "✅ Import Successful",
        description: `Transcribed "${metadata.title}" using ${transcriptionResult.provider}`
      });

    } catch (error) {
      console.error('YouTube import error:', error);
      setProcessingStatus('');
      setTranscriptionProgress(0);
      
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import YouTube content",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          Import from YouTube
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleImport}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Import'
            )}
          </Button>
        </div>

        {processingStatus && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {transcriptionProgress === 100 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {processingStatus}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${transcriptionProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
