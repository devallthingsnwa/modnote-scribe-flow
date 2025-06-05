
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Check, AlertCircle, Video, Play, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UrlContentScraper } from '@/lib/scraper/urlContentScraper';
import { YouTubeTranscriptService } from '@/lib/youtube/transcriptService';
import { VideoUtils } from '@/lib/youtube/videoUtils';

interface UrlImporterProps {
  onContentImported: (content: { title: string; content: string; sourceUrl: string }) => void;
}

export function UrlImporter({ onContentImported }: UrlImporterProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<any>(null);
  const [youtubeResult, setYoutubeResult] = useState<any>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  const [failureReason, setFailureReason] = useState<string>('');
  const [nextRetryMethod, setNextRetryMethod] = useState<string>('');
  const { toast } = useToast();

  const isYouTubeUrl = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const handleScrape = async () => {
    if (!url.trim()) return;

    if (isYouTubeUrl(url)) {
      await handleYouTubeTranscription();
    } else {
      await handleWebScraping();
    }
  };

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    setLastError('');
    setFailureReason('');
    await handleYouTubeTranscription();
  };

  const handleSpecificRetry = async (method: string) => {
    setRetryCount(prev => prev + 1);
    setLastError('');
    setFailureReason('');
    setProcessingStep(`🔄 Retrying with ${method}...`);
    
    try {
      let result;
      if (method === 'captions') {
        result = await YouTubeTranscriptService.extractTranscript(url);
      } else if (method === 'audio-transcription') {
        result = await YouTubeTranscriptService.extractTranscript(url);
      } else {
        result = await YouTubeTranscriptService.processVideoWithRetry(url, 1);
      }
      
      await processYouTubeResult(result);
    } catch (error) {
      handleYouTubeError(error);
    }
  };

  const handleYouTubeTranscription = async () => {
    setIsLoading(true);
    setYoutubeResult(null);
    setLastError('');
    setFailureReason('');
    setNextRetryMethod('');
    
    try {
      console.log(`🎯 Starting comprehensive YouTube processing for: ${url} (Attempt ${retryCount + 1})`);
      
      setProcessingStep('🔍 Analyzing YouTube video...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStep('📝 Checking for captions...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStep('🎵 Attempting audio extraction if needed...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStep('🌐 Trying external services if needed...');
      
      const result = await YouTubeTranscriptService.processVideoWithRetry(url, 3);
      await processYouTubeResult(result);
      
    } catch (error) {
      handleYouTubeError(error);
    } finally {
      setIsLoading(false);
      setProcessingStep('');
    }
  };

  const processYouTubeResult = async (result: any) => {
    if (result.success && result.transcript) {
      setYoutubeResult(result);
      setRetryCount(0);
      
      const sourceMethod = getSourceMethodLabel(result.source, result.method);
      console.log(`✅ YouTube processing successful via ${sourceMethod}`);
      
      toast({
        title: "✅ YouTube content processed!",
        description: `Successfully extracted ${result.transcript.length} characters via ${sourceMethod}`,
      });
    } else {
      await handleExtractionFailure(result);
    }
  };

  const handleExtractionFailure = async (result: any) => {
    const errorMsg = result.error || "Unable to extract transcript from this video.";
    const reason = getFailureReason(result.source, result.method);
    
    setLastError(errorMsg);
    setFailureReason(reason);
    setNextRetryMethod(result.nextMethod || '');
    
    console.error('Transcript extraction failed:', errorMsg, 'Reason:', reason);
    
    // Create fallback note with metadata
    if (result.metadata) {
      const fallbackContent = createFallbackNote(result.metadata, url, reason);
      setYoutubeResult({
        success: true,
        transcript: fallbackContent,
        metadata: result.metadata,
        source: 'fallback',
        isFallback: true
      });
      
      toast({
        title: "📋 Fallback note created",
        description: "We couldn't get the transcript, but saved the video info for you to add notes manually.",
        variant: "default"
      });
    } else {
      const canRetry = retryCount < 2 && result.retryable !== false;
      
      toast({
        title: "❌ Transcript extraction failed",
        description: canRetry ? `${errorMsg} You can try again.` : errorMsg,
        variant: "destructive"
      });
    }
  };

  const handleYouTubeError = (error: any) => {
    const errorMsg = error instanceof Error ? error.message : "Failed to process YouTube video";
    setLastError(errorMsg);
    setProcessingStep('');
    
    console.error('YouTube processing error:', error);
    
    toast({
      title: "YouTube processing error", 
      description: `${errorMsg}${retryCount < 2 ? ' You can try again.' : ''}`,
      variant: "destructive"
    });
  };

  const createFallbackNote = (metadata: any, sourceUrl: string, reason: string): string => {
    const timestamp = new Date().toISOString();
    
    return `# 🎥 ${metadata.title || 'YouTube Video'}

**Channel:** ${metadata.channel || 'Unknown'}
**Duration:** ${metadata.duration || 'Unknown'}
**Import Date:** ${new Date(timestamp).toLocaleDateString()}
**Source:** ${sourceUrl}

---

## ⚠️ Transcript Not Available

**Status:** ${reason}

We couldn't fetch the transcript for this video. This could be due to:
- Video is private or restricted
- Captions are disabled
- Audio quality is too poor for transcription
- Video contains primarily music or non-speech content

## 📝 Manual Notes

You can add your own notes about this video here:

*Click to start adding your notes...*

---

**Note:** You can try importing this video again later, or check if the video is publicly available.`;
  };

  const getSourceMethodLabel = (source: string, method?: string): string => {
    if (method) {
      switch (method) {
        case 'captions': return 'captions';
        case 'audio-transcription': return 'audio transcription';
        case 'podsqueeze': return 'PodSqueeze';
        case 'whisper': return 'Whisper';
        case 'riverside': return 'Riverside.fm';
        default: return method;
      }
    }
    
    switch (source) {
      case 'captions': return 'captions';
      case 'audio-transcription': return 'audio transcription';
      case 'external': return 'external service';
      default: return source;
    }
  };

  const getFailureReason = (source: string, method?: string): string => {
    if (method === 'fallback') return 'All transcription methods failed';
    if (source === 'fallback') return 'Audio extraction failed';
    return 'Transcript extraction failed';
  };

  const handleWebScraping = async () => {
    if (!UrlContentScraper.isValidUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setProcessingStep('🌐 Scraping web content...');
    
    try {
      const content = await UrlContentScraper.scrapeUrl(url);
      setScrapedContent(content);
      setProcessingStep('');
      toast({
        title: "Content Scraped",
        description: "Successfully extracted content from URL"
      });
    } catch (error) {
      setProcessingStep('');
      toast({
        title: "Scraping Failed",
        description: error instanceof Error ? error.message : "Failed to scrape content",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportYouTube = () => {
    if (youtubeResult && youtubeResult.transcript) {
      const videoId = VideoUtils.extractVideoId(url);
      const title = youtubeResult.metadata?.title || `YouTube Video ${videoId}`;
      
      let content = `# 🎥 ${title}\n\n`;
      content += `**Channel:** ${youtubeResult.metadata?.channel || 'Unknown'}\n`;
      content += `**Duration:** ${youtubeResult.metadata?.duration || 'Unknown'}\n`;
      content += `**Source:** ${url}\n`;
      
      if (!youtubeResult.isFallback) {
        const sourceMethod = getSourceMethodLabel(youtubeResult.source, youtubeResult.method);
        content += `**Extraction Method:** ${sourceMethod}\n\n`;
        content += `---\n\n`;
        content += `## 📝 Transcript\n\n`;
      } else {
        content += `**Status:** Fallback note\n\n`;
        content += `---\n\n`;
      }
      
      content += youtubeResult.transcript;

      onContentImported({
        title,
        content,
        sourceUrl: url
      });
      
      // Reset state
      setYoutubeResult(null);
      setUrl('');
      setRetryCount(0);
      setLastError('');
      setFailureReason('');
    }
  };

  const handleImportWeb = () => {
    if (scrapedContent) {
      onContentImported({
        title: scrapedContent.title,
        content: scrapedContent.content,
        sourceUrl: scrapedContent.url
      });
      setScrapedContent(null);
      setUrl('');
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'captions': return 'default';
      case 'audio-transcription': return 'secondary';
      default: return 'destructive';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import from URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://youtube.com/watch?v=... or any web URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleScrape}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isYouTubeUrl(url) ? (
                <>
                  <Video className="h-4 w-4 mr-1" />
                  Extract
                </>
              ) : (
                'Scrape'
              )}
            </Button>
            
            {/* Enhanced retry button with specific method retry */}
            {isYouTubeUrl(url) && lastError && !isLoading && retryCount < 3 && (
              <div className="flex gap-1">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
                {nextRetryMethod && (
                  <Button 
                    onClick={() => handleSpecificRetry(nextRetryMethod)}
                    variant="outline"
                    size="sm"
                  >
                    Try {nextRetryMethod}
                  </Button>
                )}
              </div>
            )}
          </div>

          {processingStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              {processingStep}
            </div>
          )}

          {/* Enhanced error display with specific reasons */}
          {lastError && !isLoading && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Extraction Failed</p>
                <p className="text-xs mt-1">{lastError}</p>
                {failureReason && (
                  <p className="text-xs mt-1 text-orange-600">
                    <strong>Reason:</strong> {failureReason}
                  </p>
                )}
                {retryCount < 3 && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    We couldn't fetch the transcript right now. Please check if the video is public and try again later.
                  </p>
                )}
              </div>
            </div>
          )}

          {isYouTubeUrl(url) && !processingStep && !lastError && (
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
              🎥 <strong>YouTube detected:</strong> The system will automatically attempt transcript extraction using multiple times until it gets the transcribed spoken words from the YouTube video, creating a clean, formatted note with the transcript and full video metadata.
            </div>
          )}

          {!isYouTubeUrl(url) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Supported:</span>
              {UrlContentScraper.getSupportedDomains().slice(0, 3).map(domain => (
                <Badge key={domain} variant="outline" className="text-xs">
                  {domain}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">+more</Badge>
            </div>
          )}

          {/* YouTube Results with enhanced status display */}
          {youtubeResult && (
            <Card className={youtubeResult.isFallback ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {youtubeResult.isFallback ? (
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  ) : (
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{youtubeResult.metadata?.title || 'YouTube Video'}</h4>
                      <Badge variant={youtubeResult.isFallback ? "destructive" : getSourceBadgeVariant(youtubeResult.source)} className="text-xs">
                        {youtubeResult.isFallback ? 'Fallback Note' : getSourceMethodLabel(youtubeResult.source, youtubeResult.method)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Channel: {youtubeResult.metadata?.channel || 'Unknown'} • 
                      Duration: {youtubeResult.metadata?.duration || 'Unknown'} • 
                      {youtubeResult.transcript?.length || 0} characters
                    </p>
                    {youtubeResult.isFallback && (
                      <p className="text-xs text-orange-600">
                        💡 This is a fallback note where you can add manual notes about the video.
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        YouTube {youtubeResult.isFallback ? 'Fallback' : 'Transcript'}
                      </Badge>
                      <Button size="sm" onClick={handleImportYouTube}>
                        Import {youtubeResult.isFallback ? 'Note' : 'Transcript'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Web Scraping Results */}
          {scrapedContent && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-sm">{scrapedContent.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {scrapedContent.content.substring(0, 200)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {scrapedContent.metadata.domain}
                      </Badge>
                      <Button size="sm" onClick={handleImportWeb}>
                        Import as Note
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
