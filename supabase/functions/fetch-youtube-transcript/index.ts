
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { TranscriptExtractor } from "./transcriptExtractor.ts";
import { validateVideoId, extractVideoId, corsHeaders } from "./utils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let videoId: string;
    let options = {};
    
    // Parse request body
    try {
      const body = await req.json();
      videoId = body.videoId;
      options = body.options || {};
      
      if (!videoId && body.url) {
        // Support both direct videoId and URL parameters
        videoId = extractVideoId(body.url) || '';
      }
    } catch (e) {
      // Fallback to query parameters for GET requests
      const url = new URL(req.url);
      videoId = url.searchParams.get('videoId') || '';
      
      if (!videoId) {
        const urlParam = url.searchParams.get('url');
        if (urlParam) {
          videoId = extractVideoId(urlParam) || '';
        }
      }
    }
    
    if (!videoId || !validateVideoId(videoId)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Valid YouTube video ID is required",
          transcript: "Unable to extract transcript - invalid video ID provided."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Starting enhanced transcript fetch for video: ${videoId} (extended timeout: ${options.extendedTimeout || false})`);
    
    const result = await TranscriptExtractor.extractTranscript(videoId, options);
    
    if (!result) {
      console.log("Creating structured fallback response for video:", videoId);
      
      // Create a structured fallback response with proper formatting
      const fallbackTranscript = await createStructuredFallback(videoId);
      
      return new Response(
        JSON.stringify({
          success: true,
          transcript: fallbackTranscript,
          metadata: {
            videoId,
            extractionMethod: 'structured-fallback',
            provider: 'fallback-system',
            quality: 'template',
            isWarning: true
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    return result;
    
  } catch (error) {
    console.error("Error in transcript fetch:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        transcript: "Unable to extract transcript due to an unexpected error."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function createStructuredFallback(videoId: string): Promise<string> {
  console.log("Creating structured fallback response...");
  
  // Try to get basic video metadata from oembed or other sources
  let title = `YouTube Video ${videoId}`;
  let author = 'Unknown';
  let duration = 'Unknown';
  
  try {
    // Try oembed for basic metadata
    const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json();
      if (oembedData.title) {
        title = oembedData.title.replace(/ - YouTube$/, '').trim();
      }
      if (oembedData.author_name) {
        author = oembedData.author_name;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch oembed metadata:", error);
  }
  
  // Create structured fallback content matching the requested format
  const fallbackContent = `# 🎥 ${title}

**Source:** https://www.youtube.com/watch?v=${videoId}
**Author:** ${author}
**Duration:** ${duration}
**Type:** Video Transcript

---

## 📝 Transcript

This video's transcript could not be automatically extracted. Common reasons include:

- Video doesn't have auto-generated or manual captions available
- Private or restricted content with limited access
- Live stream content without stable captions
- Language barriers or unsupported content types
- Temporary service limitations or API restrictions

### 💡 What you can do:

1. **Check YouTube directly**: Visit the video and look for the CC (closed captions) button
2. **Manual notes**: Watch the video and create your own summary below
3. **Key timestamps**: Note important moments and topics
4. **Voice notes**: Use speech-to-text to capture your thoughts while watching

---

## 📝 My Notes

### 🎯 Key Points
- [ ] Main topic/theme:
- [ ] Important insights:
- [ ] Action items:
- [ ] Questions raised:

### ⏰ Timestamps & Moments
*Add specific timestamps and what happens at those moments*

- **00:00** - 
- **05:00** - 
- **10:00** - 

### 💭 Personal Reflections
*Your thoughts, opinions, and how this relates to your interests*

---

*Note: This content was saved automatically when transcript extraction was unavailable. You can edit this note to add your own insights and observations.*`;

  return fallbackContent;
}
