
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      throw new Error('Video ID is required');
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    console.log(`Fetching metadata for video: ${videoId}`);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Parse duration from ISO 8601 format (PT4M13S -> 4:13)
    const duration = contentDetails.duration;
    const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(durationMatch[1] || '0');
    const minutes = parseInt(durationMatch[2] || '0');
    const seconds = parseInt(durationMatch[3] || '0');
    
    let formattedDuration = '';
    if (hours > 0) {
      formattedDuration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const result = {
      title: snippet.title,
      author: snippet.channelTitle,
      description: snippet.description,
      duration: formattedDuration,
      thumbnail: snippet.thumbnails.maxres?.url || 
                snippet.thumbnails.high?.url || 
                snippet.thumbnails.medium?.url ||
                `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      publishedAt: snippet.publishedAt,
      viewCount: video.statistics?.viewCount,
      tags: snippet.tags || []
    };

    console.log('Metadata fetched successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('YouTube metadata error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch metadata',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
