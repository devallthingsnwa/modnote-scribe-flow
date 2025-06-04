
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Play, Loader2, AlertCircle, CheckCircle, Video, ExternalLink, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TranscriptPreview } from './TranscriptPreview';

interface EnhancedYoutubeImportFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function EnhancedYoutubeImportForm({ onContentImported, isLoading }: EnhancedYoutubeImportFormProps) {
  const [url, setUrl] = useState('');
  const [extractedContent, setExtractedContent] = useState<{
    title: string;
    transcript: string;
    metadata?: any;
    formattedContent?: string;
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

  const formatCurrentDateTime = (): string => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatEnhancedContent = (title: string, transcript: string, metadata: any, sourceUrl: string): string => {
    const currentDateTime = formatCurrentDateTime();
    const contentType = metadata?.duration ? 'Video Transcript' : 'Podcast Transcript';
    
    let formattedContent = `# 🎥 ${title}\n\n`;
    formattedContent += `**Source:** ${sourceUrl}\n`;
    formattedContent += `**Type:** ${contentType}\n`;
    formattedContent += `**Imported:** ${currentDateTime}\n`;
    
    if (metadata?.author) {
      formattedContent += `**Channel/Author:** ${metadata.author}\n`;
    }
    
    if (metadata?.duration) {
      formattedContent += `**Duration:** ${metadata.duration}\n`;
    }
    
    if (metadata?.publishedAt) {
      formattedContent += `**Published:** ${new Date(metadata.publishedAt).toLocaleDateString()}\n`;
    }
    
    formattedContent += `\n---\n\n`;
    formattedContent += `## 📝 Transcript\n\n`;
    formattedContent += `${transcript}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 My Notes\n\n`;
    formattedContent += `Add your personal notes and thoughts here.\n`;
    
    return formattedContent;
  };

  const handleExtractTranscript = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube or podcast URL",
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
      console.log('🎥 Starting enhanced YouTube transcript extraction for:', videoId);

      // Fetch metadata and transcript in parallel for better performance
      const [transcriptResult, metadataResult] = await Promise.allSettled([
        supabase.functions.invoke('fetch-youtube-transcript', {
          body: { 
            videoId,
            options: {
              format: 'enhanced',
              includeTimestamps: false,
              language: 'auto',
              cleanOutput: true
            }
          }
        }),
        supabase.functions.invoke('youtube-metadata', {
          body: { videoId }
        })
      ]);

      let transcript = '';
      let metadata = {};
      let title = `YouTube Video ${videoId}`;

      // Process transcript result
      if (transcriptResult.status === 'fulfilled' && transcriptResult.value.data?.success) {
        transcript = transcriptResult.value.data.transcript;
        console.log('✅ Transcript extracted successfully');
      } else {
        console.warn('⚠️ Transcript extraction failed, using fallback');
        transcript = 'Transcript could not be extracted automatically. You can add your notes manually.';
      }

      // Process metadata result
      if (metadataResult.status === 'fulfilled' && metadataResult.value.data && !metadataResult.value.error) {
        metadata = metadataResult.value.data;
        title = metadata.title || title;
        console.log('✅ Metadata fetched successfully');
      } else {
        console.warn('⚠️ Metadata fetch failed, using defaults');
      }

      const thumbnail = metadata.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const formattedContent = formatEnhancedContent(title, transcript, metadata, url);
      
      setExtractedContent({
        title,
        transcript,
        metadata: {
          ...metadata,
          thumbnail,
          source_url: url,
          importedAt: formatCurrentDateTime()
        },
        formattedContent
      });

      toast({
        title: "Content Extracted",
        description: "YouTube content has been successfully processed and formatted.",
      });

    } catch (error) {
      console.error('💥 Unexpected error during content extraction:', error);
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
    const thumbnail = extractedContent.metadata?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    onContentImported({
      title: extractedContent.title,
      content: extractedContent.formattedContent || extractedContent.transcript,
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
        <h3 className="text-lg font-semibold mb-2">Enhanced Multimedia Import</h3>
        <p className="text-muted-foreground text-sm">
          Extract and format transcripts from YouTube videos and podcasts with enhanced metadata
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="media-url">YouTube or Podcast URL</Label>
        <div className="flex gap-2">
          <Input
            id="media-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=... or podcast URL"
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
      </div>

      {/* Error Display */}
      {extractionError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Processing Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{extractionError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success and Enhanced Preview */}
      {extractedContent && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Content Processed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enhanced Media Info */}
            <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg">
              <Video className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate mb-2">{extractedContent.title}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {extractedContent.metadata?.author && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Channel:</span>
                      <span>{extractedContent.metadata.author}</span>
                    </div>
                  )}
                  
                  {extractedContent.metadata?.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{extractedContent.metadata.duration}</span>
                    </div>
                  )}
                  
                  {extractedContent.metadata?.importedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Imported: {extractedContent.metadata.importedAt}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Type:</span>
                    <span>Video Transcript</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Original
                  </Button>
                </div>
              </div>
            </div>

            {/* Enhanced Preview */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium">Formatted Content Preview:</h5>
              <div className="bg-background/70 border rounded-lg p-4 max-h-40 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {extractedContent.formattedContent?.substring(0, 500)}
                  {extractedContent.formattedContent && extractedContent.formattedContent.length > 500 && '...'}
                </pre>
              </div>
            </div>

            {/* Import Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="px-6"
              >
                <Video className="h-4 w-4 mr-2" />
                Import Enhanced Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Help Text */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-sm">Enhanced Features:</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 🎥 Professional transcript formatting with metadata</p>
          <p>• 📅 Automatic timestamping and source tracking</p>
          <p>• 🔄 Fallback transcription services for reliability</p>
          <p>• 📝 Pre-formatted sections for personal notes</p>
          <p>• 🧹 Clean output focused on spoken content only</p>
        </div>
      </div>
    </div>
  );
}
