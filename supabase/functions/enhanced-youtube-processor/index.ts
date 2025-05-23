
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
        result = await fetchTranscriptWithRetry(videoId);
        break;
      
      case "process_complete":
        // Fetch both metadata and transcript
        const metadata = await fetchVideoMetadata(videoId);
        const transcript = await fetchTranscriptWithRetry(videoId);
        
        result = {
          metadata,
          transcript: transcript.transcript,
          success: metadata.success && transcript.success
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

async function fetchTranscriptWithRetry(videoId: string, maxRetries: number = 3): Promise<{ success: boolean; transcript?: string; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Transcript fetch attempt ${attempt} for video ${videoId}`);
      
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Extract caption tracks
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
      
      // Fetch caption content
      let captionUrl = selectedTrack.baseUrl;
      if (!captionUrl.startsWith('http')) {
        captionUrl = `https://www.youtube.com${captionUrl}`;
      }
      
      // Request WebVTT format
      if (!captionUrl.includes('fmt=')) {
        captionUrl += captionUrl.includes('?') ? '&fmt=vtt' : '?fmt=vtt';
      }
      
      const captionResponse = await fetch(captionUrl);
      if (!captionResponse.ok) {
        throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
      }
      
      const captionContent = await captionResponse.text();
      const transcript = parseTranscript(captionContent);
      
      if (!transcript) {
        throw new Error("Failed to parse transcript content");
      }
      
      return { success: true, transcript };
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: `Failed after ${maxRetries} attempts: ${error.message}` 
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return { success: false, error: "Unexpected error in retry logic" };
}

function parseTranscript(captionContent: string): string | null {
  try {
    const segments = [];
    
    if (captionContent.includes('WEBVTT')) {
      // Parse WebVTT format
      const lines = captionContent.split('\n');
      let currentCue = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine === 'WEBVTT' || trimmedLine.startsWith('Kind:') || trimmedLine.startsWith('Language:')) {
          continue;
        }
        
        // Timestamp line
        const timestampRegex = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/;
        const timestampMatch = trimmedLine.match(timestampRegex);
        
        if (timestampMatch) {
          if (currentCue?.text) {
            segments.push(currentCue);
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
    }
    
    if (segments.length === 0) {
      return null;
    }
    
    // Format transcript with timestamps
    return segments
      .map(segment => `[${segment.start.substring(0, 8)} - ${segment.end.substring(0, 8)}] ${segment.text}`)
      .join('\n');
      
  } catch (error) {
    console.error("Error parsing transcript:", error);
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
