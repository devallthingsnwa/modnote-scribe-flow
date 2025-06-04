
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UrlContentScraper } from '@/lib/scraper/urlContentScraper';

interface UrlImporterProps {
  onContentImported: (content: { title: string; content: string; sourceUrl: string }) => void;
}

export function UrlImporter({ onContentImported }: UrlImporterProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<any>(null);
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!url.trim()) return;

    if (!UrlContentScraper.isValidUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const content = await UrlContentScraper.scrapeUrl(url);
      setScrapedContent(content);
      toast({
        title: "Content Scraped",
        description: "Successfully extracted content from URL"
      });
    } catch (error) {
      toast({
        title: "Scraping Failed",
        description: error instanceof Error ? error.message : "Failed to scrape content",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
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
              placeholder="https://example.com/article"
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
              ) : (
                'Scrape'
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Supported:</span>
            {UrlContentScraper.getSupportedDomains().slice(0, 3).map(domain => (
              <Badge key={domain} variant="outline" className="text-xs">
                {domain}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs">+more</Badge>
          </div>

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
                      <Button size="sm" onClick={handleImport}>
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
