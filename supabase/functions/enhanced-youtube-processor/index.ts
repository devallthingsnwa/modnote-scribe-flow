import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VideoMetadata {
  title: string;
  author: string;
  duration: string;
  viewCount?: string;
  publishDate?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, action, options } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Video ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing video ${videoId} with action: ${action}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any = {};

    switch (action) {
      case "fetch_metadata":
        result = await fetchVideoMetadata(videoId);
        break;
      
      case "fetch_transcript":
        // Enhanced transcript fetching with extended timeout for longer videos
        result = await fetchTranscriptWithExtendedRetry(videoId, options?.extendedTimeout || false);
        break;
      
      case "process_complete":
        // Fetch both metadata and transcript with enhanced handling
        const metadata = await fetchVideoMetadata(videoId);
        const transcript = await fetchTranscriptWithExtendedRetry(videoId, true);
        
        result = {
          metadata,
          transcript: transcript.transcript,
          success: metadata.success && transcript.success,
          isLongVideo: transcript.isLongVideo || false
        };
        break;
      
      case "save_note":
        // Save or update note in database
        const { noteData } = options;
        result = await saveVideoNote(supabase, noteData);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in enhanced-youtube-processor:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to process YouTube video",
        details: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fetchVideoMetadata(videoId: string): Promise<{ success: boolean; metadata?: VideoMetadata; error?: string }> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract metadata from HTML
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : "Unknown Title";
    
    // Extract from ytInitialPlayerResponse
    const playerResponseRegex = /"ytInitialPlayerResponse"\s*:\s*({.+?})\s*;/;
    const playerResponseMatch = html.match(playerResponseRegex);
    
    let metadata: VideoMetadata = {
      title,
      author: "Unknown Author",
      duration: "Unknown"
    };
    
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const videoDetails = playerResponse?.videoDetails;
        
        if (videoDetails) {
          metadata = {
            title: videoDetails.title || title,
            author: videoDetails.author || "Unknown Author",
            duration: formatDuration(parseInt(videoDetails.lengthSeconds || "0")),
            viewCount: videoDetails.viewCount || undefined,
            description: videoDetails.shortDescription?.substring(0, 500) || undefined
          };
        }
      } catch (e) {
        console.log("Error parsing player response for metadata:", e);
      }
    }
    
    return { success: true, metadata };
    
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    return { success: false, error: error.message };
  }
}

async function fetchTranscriptWithExtendedRetry(videoId: string, extendedTimeout: boolean = false, maxRetries: number = 3): Promise<{ success: boolean; transcript?: string; error?: string; isLongVideo?: boolean }> {
  const baseTimeout = extendedTimeout ? 90000 : 45000; // 90s for extended, 45s for normal
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Extended transcript fetch attempt ${attempt} for video ${videoId} (timeout: ${baseTimeout}ms)`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), baseTimeout);
      
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Extract caption tracks with enhanced parsing for longer videos
      const playerResponseRegex = /"ytInitialPlayerResponse"\s*:\s*({.+?})\s*;/;
      const playerResponseMatch = html.match(playerResponseRegex);
      
      if (!playerResponseMatch) {
        throw new Error("Could not find player response in HTML");
      }
      
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
        return { 
          success: false, 
          error: "No captions available for this video" 
        };
      }
      
      // Find best caption track (prefer English)
      let selectedTrack = captionTracks[0];
      for (const track of captionTracks) {
        if (track.languageCode === 'en' || track.vssId?.includes('en')) {
          selectedTrack = track;
          break;
        }
      }
      
      // Fetch caption content with extended timeout
      let captionUrl = selectedTrack.baseUrl;
      if (!captionUrl.startsWith('http')) {
        captionUrl = `https://www.youtube.com${captionUrl}`;
      }
      
      // Request WebVTT format
      if (!captionUrl.includes('fmt=')) {
        captionUrl += captionUrl.includes('?') ? '&fmt=vtt' : '?fmt=vtt';
      }
      
      const captionController = new AbortController();
      const captionTimeoutId = setTimeout(() => captionController.abort(), baseTimeout);
      
      const captionResponse = await fetch(captionUrl, {
        signal: captionController.signal
      });
      
      clearTimeout(captionTimeoutId);
      
      if (!captionResponse.ok) {
        throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
      }
      
      const captionContent = await captionResponse.text();
      const transcript = parseTranscriptWithEnhancedHandling(captionContent);
      
      if (!transcript) {
        throw new Error("Failed to parse transcript content");
      }
      
      // Detect if this is a long video based on transcript length
      const isLongVideo = transcript.length > 5000;
      
      console.log(`✅ ${isLongVideo ? 'Long video' : 'Standard video'} transcript extracted: ${transcript.length} characters`);
      
      return { 
        success: true, 
        transcript,
        isLongVideo
      };
      
    } catch (error) {
      console.error(`Extended attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: `Failed after ${maxRetries} extended attempts: ${error.message}` 
        };
      }
      
      // Progressive backoff for longer videos
      const delay = attempt === 1 ? 2000 : (attempt === 2 ? 5000 : 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { success: false, error: "Unexpected error in extended retry logic" };
}

function parseTranscriptWithEnhancedHandling(captionContent: string): string | null {
  try {
    const segments = [];
    
    if (captionContent.includes('WEBVTT')) {
      // Enhanced parsing for longer videos with better memory management
      const lines = captionContent.split('\n');
      let currentCue = null;
      let processedSegments = 0;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine === 'WEBVTT' || trimmedLine.startsWith('Kind:') || trimmedLine.startsWith('Language:')) {
          continue;
        }
        
        // Enhanced timestamp parsing for longer videos
        const timestampRegex = /^(\d{1,2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3})/;
        const timestampMatch = trimmedLine.match(timestampRegex);
        
        if (timestampMatch) {
          if (currentCue?.text) {
            segments.push(currentCue);
            processedSegments++;
            
            // Log progress for very long videos
            if (processedSegments % 100 === 0) {
              console.log(`Processed ${processedSegments} transcript segments...`);
            }
          }
          
          currentCue = {
            start: timestampMatch[1],
            end: timestampMatch[2],
            text: ''
          };
        } else if (currentCue && trimmedLine) {
          currentCue.text += (currentCue.text ? ' ' : '') + trimmedLine
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]*>/g, '');
        }
      }
      
      if (currentCue?.text) {
        segments.push(currentCue);
      }
      
      console.log(`✅ Parsed ${segments.length} transcript segments`);
    }
    
    if (segments.length === 0) {
      return null;
    }
    
    // Enhanced formatting for longer videos with chunked processing
    const chunkSize = 50; // Process in chunks to avoid memory issues
    const formattedChunks = [];
    
    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunk = segments.slice(i, i + chunkSize);
      const formattedChunk = chunk
        .map(segment => `[${segment.start.substring(0, 8)} - ${segment.end.substring(0, 8)}] ${segment.text}`)
        .join('\n');
      formattedChunks.push(formattedChunk);
    }
    
    return formattedChunks.join('\n');
      
  } catch (error) {
    console.error("Error parsing enhanced transcript:", error);
    return null;
  }
}

async function saveVideoNote(supabase: any, noteData: any): Promise<{ success: boolean; noteId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .upsert(noteData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return { success: true, noteId: data.id };
    
  } catch (error) {
    console.error("Error saving note:", error);
    return { success: false, error: error.message };
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
