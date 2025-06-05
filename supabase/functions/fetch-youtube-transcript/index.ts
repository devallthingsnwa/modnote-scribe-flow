
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, videoUrl } = await req.json();
    
    if (!videoId && !videoUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          transcript: "",
          error: "Missing videoId or videoUrl parameter"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const extractedVideoId = videoId || extractVideoId(videoUrl);
    console.log(`🎯 Processing transcript for: ${extractedVideoId}`);

    // Try caption extraction
    const transcript = await fetchTranscript(extractedVideoId);
    
    return new Response(
      JSON.stringify({
        success: true,
        transcript: transcript,
        source: 'captions'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Transcript extraction failed:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        transcript: "",
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Try direct caption API
  const captionUrls = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=auto&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=srv3`
  ];

  for (const url of captionUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const content = await response.text();
        if (content.includes('<text') && content.length > 100) {
          return parseXMLTranscript(content);
        }
      }
    } catch (error) {
      continue;
    }
  }

  // Fallback to page scraping
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok) {
      const html = await response.text();
      const captionUrl = extractCaptionUrlFromPage(html);
      
      if (captionUrl) {
        const captionResponse = await fetch(captionUrl);
        const content = await captionResponse.text();
        return parseXMLTranscript(content);
      }
    }
  } catch (error) {
    console.log("Page scraping failed:", error.message);
  }

  throw new Error('No transcript available for this video');
}

function extractCaptionUrlFromPage(html: string): string | null {
  const patterns = [
    /"captionTracks":\s*\[([^\]]+)\]/,
    /"captions":\s*\{[^}]*"playerCaptionsTracklistRenderer":\s*\{[^}]*"captionTracks":\s*\[([^\]]+)\]/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const tracks = JSON.parse(`[${match[1]}]`);
        const bestTrack = tracks.find((track: any) => 
          track.languageCode === 'en' && track.kind !== 'asr'
        ) || tracks.find((track: any) => 
          track.languageCode === 'en'
        ) || tracks[0];
        
        return bestTrack?.baseUrl || null;
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
}

function parseXMLTranscript(content: string): string {
  const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
  const segments: string[] = [];
  let match;
  
  while ((match = textRegex.exec(content)) !== null) {
    const text = cleanText(match[1]);
    if (text && text.trim()) {
      segments.push(text.trim());
    }
  }
  
  // Join segments and standardize music tags
  let rawText = segments.join(' ');
  
  // Standardize music/sound tags
  rawText = rawText
    .replace(/\[Music\]/gi, '[Musika]')
    .replace(/\[♪\]/gi, '[Musika]')
    .replace(/\[♫\]/gi, '[Musika]')
    .replace(/\[música\]/gi, '[Musika]')
    .replace(/\[Applause\]/gi, '[Palakpakan]')
    .replace(/\[Laughter\]/gi, '[Tawa]')
    .replace(/\s+/g, ' ')
    .trim();

  return rawText;
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
