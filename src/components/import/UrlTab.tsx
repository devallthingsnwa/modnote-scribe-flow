
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Link, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { WebScrapingService } from "@/lib/webScrapingService";
import { useToast } from "@/hooks/use-toast";

interface UrlTabProps {
  url: string;
  setUrl: (url: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  onScrapingResult?: (result: any) => void;
}

export function UrlTab({ url, setUrl, onProcess, isProcessing, onScrapingResult }: UrlTabProps) {
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'scraping' | 'success' | 'error'>('idle');
  const [scrapedData, setScrapedData] = useState<any>(null);
  const { toast } = useToast();

  const handleScrapeWebsite = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to scrape",
        variant: "destructive"
      });
      return;
    }

    setScrapingStatus('scraping');
    
    try {
      // Format URL if needed
      const formattedUrl = WebScrapingService.formatUrl(url.trim());
      setUrl(formattedUrl);

      // Perform web scraping
      const result = await WebScrapingService.scrapeWebsite(formattedUrl);
      
      if (result.success && result.data) {
        setScrapedData(result.data);
        setScrapingStatus('success');
        
        // Pass the scraped data to parent component
        if (onScrapingResult) {
          onScrapingResult({
            title: result.data.title,
            content: result.data.content,
            metadata: {
              ...result.data.metadata,
              url: result.data.url
            }
          });
        }

        toast({
          title: "✅ Website Scraped Successfully!",
          description: `Extracted content from ${new URL(formattedUrl).hostname}`
        });
      } else {
        setScrapingStatus('error');
        toast({
          title: "❌ Scraping Failed",
          description: result.error || "Failed to scrape website content",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Scraping error:', error);
      setScrapingStatus('error');
      toast({
        title: "❌ Scraping Error",
        description: "An unexpected error occurred while scraping",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (scrapingStatus) {
      case 'scraping':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const getButtonText = () => {
    switch (scrapingStatus) {
      case 'scraping':
        return 'Scraping...';
      case 'success':
        return 'Scraped Successfully';
      case 'error':
        return 'Try Again';
      default:
        return 'Scrape Website';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 text-white">Website URL</label>
        <Input
          placeholder="https://example.com/article..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            // Reset status when URL changes
            if (scrapingStatus !== 'idle') {
              setScrapingStatus('idle');
              setScrapedData(null);
            }
          }}
          className="mb-4 bg-[#1c1c1c] border-[#333] text-white placeholder-gray-400 focus:border-[#555]"
        />
        
        <div className="flex gap-2">
          <Button
            onClick={handleScrapeWebsite}
            disabled={scrapingStatus === 'scraping' || !url.trim()}
            className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border-[#333]"
          >
            {getStatusIcon()}
            <span className="ml-2">{getButtonText()}</span>
          </Button>
          
          {scrapedData && (
            <Button
              onClick={onProcess}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Import Content'
              )}
            </Button>
          )}
        </div>

        {scrapedData && scrapingStatus === 'success' && (
          <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
            <h4 className="text-sm font-medium text-white mb-2">Preview:</h4>
            <div className="space-y-2">
              <p className="text-xs text-green-400">✅ Title: {scrapedData.title}</p>
              <p className="text-xs text-gray-400">📝 Content: {scrapedData.content.substring(0, 100)}...</p>
              <p className="text-xs text-gray-400">🔗 URL: {scrapedData.url}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
