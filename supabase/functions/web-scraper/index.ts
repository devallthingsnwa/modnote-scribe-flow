
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapingRequest {
  url: string;
  options?: {
    extractText?: boolean;
    extractImages?: boolean;
    maxLength?: number;
  };
}

interface ScrapingResponse {
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

async function scrapeWebsite(url: string, options: any = {}): Promise<ScrapingResponse> {
  try {
    console.log('Starting web scraping for URL:', url);
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Set up fetch options with proper headers to mimic a real browser
    const fetchOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    };

    console.log('Fetching webpage content...');
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} characters of HTML`);

    // Parse HTML content
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Extract meta description
    const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) ||
                           html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    // Extract meta author
    const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"[^>]*>/i) ||
                       html.match(/<meta[^>]*content="([^"]*)"[^>]*name="author"[^>]*>/i);
    const author = authorMatch ? authorMatch[1].trim() : '';

    // Extract Open Graph image
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i) ||
                      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"[^>]*>/i);
    const imageUrl = imageMatch ? imageMatch[1].trim() : '';

    // Extract main content by removing script, style, and other non-content tags
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length if specified
    const maxLength = options.maxLength || 10000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    console.log(`Successfully extracted content: ${content.length} characters`);

    return {
      success: true,
      data: {
        title,
        content,
        url,
        metadata: {
          description,
          author,
          imageUrl
        }
      }
    };

  } catch (error) {
    console.error('Web scraping failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown scraping error'
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ScrapingRequest = await req.json();
    console.log('Web scraping request received:', requestData);

    if (!requestData.url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await scrapeWebsite(requestData.url, requestData.options || {});
    
    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Request processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process request' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
