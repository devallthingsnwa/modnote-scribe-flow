
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
    const { content, type, options } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${type} content with DeepSeek. Options:`, options);
    
    // Build the analysis prompt based on selected options
    let analysisInstructions = "Please analyze the following content and provide:\n";
    const requestedAnalysis = [];
    
    if (options?.summary) {
      requestedAnalysis.push("1. **Summary**: A comprehensive summary of the main topics and key information");
    }
    
    if (options?.highlights) {
      requestedAnalysis.push("2. **Key Highlights**: The most important points, insights, or memorable moments");
    }
    
    if (options?.keyPoints) {
      requestedAnalysis.push("3. **Key Points**: A structured list of the main takeaways and actionable insights");
    }
    
    // If no specific options selected, provide a general analysis
    if (requestedAnalysis.length === 0) {
      analysisInstructions += "A comprehensive analysis including summary, key highlights, and main takeaways.";
    } else {
      analysisInstructions += requestedAnalysis.join("\n");
    }
    
    analysisInstructions += "\n\nPlease format your response with clear headings and structure it for easy reading.";
    
    // Prepare system prompt based on content type
    let systemPrompt = "You are an expert content analyst that helps users understand and extract value from various types of content.";
    if (type === "video" || type === "audio") {
      systemPrompt = "You are an expert content analyst specializing in video and audio transcript analysis. You excel at extracting key insights, summarizing main points, and identifying important highlights from spoken content.";
    } else if (type === "text") {
      systemPrompt = "You are an expert content analyst specializing in text analysis. You excel at extracting key insights, summarizing main points, and identifying important highlights from written content.";
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
            content: `${analysisInstructions}\n\nContent to analyze:\n\n${content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
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
