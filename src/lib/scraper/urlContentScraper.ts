
interface ScrapedContent {
  title: string;
  content: string;
  url: string;
  metadata: {
    description?: string;
    author?: string;
    publishDate?: string;
    domain: string;
  };
}

export class UrlContentScraper {
  static async scrapeUrl(url: string): Promise<ScrapedContent> {
    try {
      // Validate URL
      const urlObj = new URL(url);
      
      // For now, we'll use a simple fetch approach
      // In production, you might want to use a dedicated scraping service
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&video=false`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'success') {
        throw new Error('Failed to scrape content');
      }
      
      const { title, description, author, date, publisher } = data.data;
      
      // Extract text content (simplified)
      let content = description || '';
      
      // Try to get more content if available
      if (data.data.text) {
        content = data.data.text;
      }
      
      return {
        title: title || 'Untitled',
        content: content || 'No content extracted',
        url: url,
        metadata: {
          description: description,
          author: author || publisher?.name,
          publishDate: date,
          domain: urlObj.hostname
        }
      };
    } catch (error) {
      console.error('Scraping error:', error);
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  
  static getSupportedDomains(): string[] {
    return [
      'medium.com',
      'substack.com',
      'wikipedia.org',
      'github.com',
      'stackoverflow.com',
      'news.ycombinator.com',
      'reddit.com'
    ];
  }
}
