
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
    await handleYouTubeTranscription();
  };

  const handleYouTubeTranscription = async () => {
    setIsLoading(true);
    setYoutubeResult(null);
    setLastError('');
    const currentRetry = retryCount;
    
    try {
      console.log(`🎯 Starting YouTube transcript extraction for: ${url} (Attempt ${currentRetry + 1})`);
      
      // Enhanced status updates
      setProcessingStep('🔍 Analyzing YouTube video...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      
      setProcessingStep('📝 Attempting to extract captions...');
      
      const result = await YouTubeTranscriptService.processVideoWithRetry(url, 2);
      
      if (result.success && result.transcript) {
        setYoutubeResult(result);
        setProcessingStep('');
        setRetryCount(0); // Reset retry count on success
        
        const sourceMethod = result.source === 'captions' ? 'captions' : 'audio transcription';
        console.log(`✅ YouTube transcript extraction successful via ${sourceMethod}`);
        
        toast({
          title: "✅ YouTube transcript extracted!",
          description: `Successfully extracted ${result.transcript.length} characters via ${sourceMethod}`,
        });
      } else {
        const errorMsg = result.error || "Unable to extract transcript from this video. This video may not have captions available or may be restricted.";
        setLastError(errorMsg);
        setProcessingStep('');
        
        console.error('Transcript extraction failed:', errorMsg);
        
        // Show retry option for certain errors
        const canRetry = currentRetry < 2 && !errorMsg.includes('restricted') && !errorMsg.includes('private');
        
        toast({
          title: "❌ Transcript extraction failed",
          description: canRetry ? `${errorMsg} Click retry to try again.` : errorMsg,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to process YouTube video";
      setLastError(errorMsg);
      setProcessingStep('');
      
      console.error('YouTube transcription error:', error);
      
      toast({
        title: "YouTube processing error", 
        description: `${errorMsg}${currentRetry < 2 ? ' Click retry to try again.' : ''}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
      content += `**Extraction Method:** ${youtubeResult.source === 'captions' ? 'Captions' : 'Audio Transcription'}\n\n`;
      content += `---\n\n`;
      content += `## 📝 Transcript\n\n`;
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
            
            {/* Retry button for YouTube failures */}
            {isYouTubeUrl(url) && lastError && !isLoading && retryCount < 2 && (
              <Button 
                onClick={handleRetry}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>

          {processingStep && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              {processingStep}
            </div>
          )}

          {/* Error display */}
          {lastError && !isLoading && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Extraction Failed</p>
                <p className="text-xs mt-1">{lastError}</p>
                {retryCount < 2 && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    You can try again with the retry button above.
                  </p>
                )}
              </div>
            </div>
          )}

          {isYouTubeUrl(url) && !processingStep && !lastError && (
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
              🎥 <strong>YouTube detected:</strong> Will extract captions first, then fallback to audio transcription if needed
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

          {/* YouTube Results */}
          {youtubeResult && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{youtubeResult.metadata?.title || 'YouTube Video'}</h4>
                      <Badge variant={getSourceBadgeVariant(youtubeResult.source)} className="text-xs">
                        {youtubeResult.source === 'captions' ? 'Captions' : 'Audio Transcription'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Channel: {youtubeResult.metadata?.channel || 'Unknown'} • 
                      Duration: {youtubeResult.metadata?.duration || 'Unknown'} • 
                      {youtubeResult.transcript?.length || 0} characters
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        YouTube Transcript
                      </Badge>
                      <Button size="sm" onClick={handleImportYouTube}>
                        Import Transcript
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
