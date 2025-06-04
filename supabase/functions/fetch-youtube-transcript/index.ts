
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
        videoId = extractVideoId(body.url) || '';
      }
    } catch (e) {
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

    console.log(`Starting enhanced transcript fetch for video: ${videoId}`);
    
    const result = await TranscriptExtractor.extractTranscript(videoId, options);
    
    if (!result) {
      console.log("No transcript available, triggering audio processing fallback");
      
      try {
        const audioResult = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-audio-transcription`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId,
            options: {
              language: 'en',
              quality: 'medium'
            }
          })
        });

        if (audioResult.ok) {
          const audioData = await audioResult.json();
          if (audioData.success && audioData.transcript) {
            console.log("Audio transcription successful, returning processed transcript");
            
            return new Response(
              JSON.stringify({
                success: true,
                transcript: audioData.transcript,
                metadata: {
                  videoId,
                  extractionMethod: 'youtube-audio-transcription',
                  provider: 'supadata-audio',
                  quality: 'medium',
                  fallbackUsed: true
                }
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          }
        }
      } catch (audioError) {
        console.warn("Audio transcription fallback failed:", audioError);
      }

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
  
  let title = `YouTube Video ${videoId}`;
  let author = 'Unknown';
  let duration = 'Unknown';
  
  try {
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
  
  const fallbackContent = `This YouTube video could not be automatically transcribed. Common reasons:

- **No Captions Available**: Video doesn't have auto-generated or manual captions
- **Private/Restricted Content**: Video has access restrictions
- **Live Stream**: Live content may not have stable captions
- **Language Barriers**: Non-English content without proper language detection
- **Technical Issues**: Temporary service limitations or API restrictions

### 💡 Alternative Options

1. **Check YouTube Captions**: Visit the video directly and look for CC button
2. **Manual Summary**: Watch and create your own key points below
3. **Audio Recording**: Use voice notes to summarize while watching
4. **Third-party Tools**: Try external transcription services

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

*Note: This content was saved automatically when transcription was unavailable. You can edit this note to add your own insights and observations.*`;

  return fallbackContent;
}
