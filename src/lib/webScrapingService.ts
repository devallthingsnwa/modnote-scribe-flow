
import { supabase } from "@/integrations/supabase/client";

export interface WebScrapingResult {
  success: boolean;
  data?: {
    title: string;
    content: string;
    url: string;
    metadata?: {
      description?: string;
      author?: string;
      publishDate?: string;
      imageUrl?: string;
    };
  };
  error?: string;
}

export class WebScrapingService {
  static async scrapeWebsite(url: string): Promise<WebScrapingResult> {
    try {
      console.log('Starting web scraping for:', url);
      
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return {
          success: false,
          error: 'Please enter a valid URL (e.g., https://example.com)'
        };
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: {
          url,
          options: {
            extractText: true,
            maxLength: 15000
          }
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return {
          success: false,
          error: `Scraping failed: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No data received from scraping service'
        };
      }

      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to scrape website'
        };
      }

      console.log('Web scraping successful:', data.data?.title);
      return data;

    } catch (error) {
      console.error('Web scraping service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static formatUrl(url: string): string {
    // Add https:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
}
