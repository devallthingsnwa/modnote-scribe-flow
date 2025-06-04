
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, AlertCircle, CheckCircle, Video, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TranscriptPreview } from './TranscriptPreview';

interface YoutubeImportFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function YoutubeImportForm({ onContentImported, isLoading }: YoutubeImportFormProps) {
  const [url, setUrl] = useState('');
  const [extractedContent, setExtractedContent] = useState<{
    title: string;
    transcript: string;
    metadata?: any;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const { toast } = useToast();

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    return extractVideoId(url) !== null;
  };

  const handleExtractTranscript = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) return;

    setIsExtracting(true);
    setExtractionError(null);
    setExtractedContent(null);

    try {
      console.log('🎥 Starting YouTube transcript extraction for:', videoId);

      // Request raw format for continuous text output
      const { data, error } = await supabase.functions.invoke('fetch-youtube-transcript', {
        body: { 
          videoId,
          options: {
            format: 'raw', // Request raw continuous format
            includeTimestamps: false,
            language: 'auto'
          }
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        setExtractionError(`Function error: ${error.message}`);
        toast({
          title: "Extraction Failed",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.success && data?.transcript) {
        console.log('✅ Transcript extracted successfully');
        
        const title = data.metadata?.title || `YouTube Video ${videoId}`;
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        setExtractedContent({
          title,
          transcript: data.transcript,
          metadata: {
            ...data.metadata,
            thumbnail,
            source_url: url
          }
        });

        toast({
          title: "Transcript Extracted",
          description: "YouTube transcript has been successfully extracted.",
        });
      } else {
        const errorMessage = data?.error || 'Unknown extraction error';
        console.error('❌ Transcript extraction failed:', errorMessage);
        setExtractionError(errorMessage);
        
        toast({
          title: "Extraction Failed", 
          description: errorMessage,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('💥 Unexpected error during transcript extraction:', error);
      const errorMessage = error.message || 'Unexpected error occurred';
      setExtractionError(errorMessage);
      
      toast({
        title: "Extraction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImport = () => {
    if (!extractedContent) return;

    const videoId = extractVideoId(url);
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    onContentImported({
      title: extractedContent.title,
      content: extractedContent.transcript,
      source_url: url,
      thumbnail,
      is_transcription: true
    });

    // Reset form
    setUrl('');
    setExtractedContent(null);
    setExtractionError(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">YouTube Video Import</h3>
        <p className="text-muted-foreground text-sm">
          Extract transcripts from YouTube videos and import them as notes
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="youtube-url">YouTube URL</Label>
        <div className="flex gap-2">
          <Input
            id="youtube-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isExtracting}
            className="flex-1"
          />
          <Button
            onClick={handleExtractTranscript}
            disabled={isExtracting || !url.trim()}
            className="px-6"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Extract
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {extractionError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Extraction Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{extractionError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success and Preview */}
      {extractedContent && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Transcript Extracted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Info */}
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
              <Video className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{extractedContent.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {extractedContent.metadata?.author || 'Unknown'} • {extractedContent.metadata?.duration || 'Unknown duration'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Video
                  </Button>
                </div>
              </div>
            </div>

            {/* Transcript Preview */}
            <TranscriptPreview transcript={extractedContent.transcript} />

            {/* Import Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="px-6"
              >
                <Video className="h-4 w-4 mr-2" />
                Import as Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-sm">How it works:</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Paste any YouTube URL to extract video transcripts</p>
          <p>• Automatically fetches captions and video metadata</p>
          <p>• Supports both auto-generated and manual captions</p>
          <p>• Raw transcript format for continuous text output</p>
        </div>
      </div>
    </div>
  );
}
