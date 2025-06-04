
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, options = {} } = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    console.log('Starting audio extraction and transcription for video:', videoId);

    // Step 1: Use yt-dlp to extract audio URL (this is a common approach)
    const youtubeUrl = `https://youtube.com/watch?v=${videoId}`;
    
    // For now, let's use a different approach - try to get the audio directly using youtube-dl-exec
    // Since we can't install packages in edge functions, we'll use a public API service
    
    console.log('Attempting to extract audio using youtube-dl service...');
    
    // Try using a public youtube-dl API service
    const ytDlResponse = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`));
    
    if (!ytDlResponse.ok) {
      throw new Error('Failed to access YouTube video');
    }
    
    // Since we can't easily extract audio in the edge function environment,
    // let's use OpenAI Whisper with a different approach
    
    // Alternative: Use youtube transcript API first, then fallback to a simpler approach
    console.log('Trying YouTube transcript API as primary method...');
    
    try {
      // Use youtube-transcript npm package approach via a public API
      const transcriptResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`)}`);
      
      if (transcriptResponse.ok) {
        const transcriptData = await transcriptResponse.json();
        const parsedContent = JSON.parse(transcriptData.contents);
        
        if (parsedContent.events && parsedContent.events.length > 0) {
          const transcript = parsedContent.events
            .filter(event => event.segs)
            .map(event => event.segs.map(seg => seg.utf8).join(''))
            .join(' ')
            .trim();
            
          if (transcript && transcript.length > 50) {
            console.log('Successfully extracted transcript via YouTube API');
            
            return new Response(
              JSON.stringify({
                success: true,
                transcript: transcript,
                metadata: {
                  videoId,
                  extractionMethod: 'youtube-api-direct',
                  provider: 'youtube-captions',
                  confidence: 0.95,
                  language: 'en',
                  processing_time: Date.now(),
                  transcript_length: transcript.length
                }
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }
      }
    } catch (error) {
      console.log('YouTube transcript API failed, trying alternative approach:', error);
    }
    
    // If transcript extraction fails, we'll simulate audio transcription with a placeholder
    // In a real implementation, you would need proper audio extraction tools
    
    console.log('Transcript extraction failed, using fallback approach');
    
    // Return a failure response that will trigger the fallback in the main service
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Audio extraction not available - YouTube transcript service failed',
        transcript: null,
        metadata: {
          error_type: 'audio_extraction_unavailable',
          attempted_strategy: 'youtube-audio-transcription',
          videoId
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('YouTube audio transcription error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Audio transcription failed',
        transcript: null,
        metadata: {
          error_type: 'transcription_failed',
          attempted_strategy: 'youtube-audio-transcription'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
