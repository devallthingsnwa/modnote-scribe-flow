
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${type} content with DeepSeek`);
    
    // Prepare system prompt based on content type
    let systemPrompt = "You are a helpful assistant that summarizes content.";
    if (type === "video" || type === "audio") {
      systemPrompt = "You are a helpful assistant that summarizes transcripts from video or audio content. Extract key points, insights, and organize them clearly.";
    } else if (type === "text") {
      systemPrompt = "You are a helpful assistant that summarizes text content. Extract key points, insights, and organize them clearly.";
    }

    // Call DeepSeek API
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system", 
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please provide a summary and analysis of the following ${type} content:\n\n${content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error response:", errorText);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to process content with DeepSeek", 
          details: errorText,
          status: response.status 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const processedContent = data.choices?.[0]?.message?.content || "No processed content available.";

    console.log("Content processed successfully with DeepSeek");
    
    return new Response(
      JSON.stringify({ 
        processedContent,
        rawResponse: data // Include raw response for debugging
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-content-with-deepseek function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing content with DeepSeek",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
