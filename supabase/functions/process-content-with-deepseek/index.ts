
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Get the API key and check if it exists
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    
    if (!DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "DeepSeek API key is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${type} content with DeepSeek. Options:`, options);
    console.log("API Key exists:", DEEPSEEK_API_KEY ? "Yes" : "No");
    
    // Prepare system prompt based on content type and options
    let systemPrompt = "You are an expert AI assistant that helps users understand and extract value from various types of content.";
    let analysisInstructions = "";
    
    if (type === "chat" && options?.rag) {
      systemPrompt = "You are an advanced AI assistant with RAG (Retrieval-Augmented Generation) capabilities. You excel at analyzing content, retrieving relevant information, and providing comprehensive answers based on the provided knowledge base. You maintain context from conversations and provide educational, helpful responses.";
      analysisInstructions = "Using the provided knowledge base and conversation context, provide a helpful, accurate, and educational response. Reference specific parts of the content when relevant and maintain conversational flow.";
    } else if (type === "video" || type === "audio") {
      systemPrompt = "You are an expert content analyst specializing in video and audio transcript analysis. You excel at extracting key insights, summarizing main points, and identifying important highlights from spoken content.";
    } else if (type === "text") {
      systemPrompt = "You are an expert content analyst specializing in text analysis. You excel at extracting key insights, summarizing main points, and identifying important highlights from written content.";
    }

    // Build the analysis prompt based on selected options for non-chat requests
    if (type !== "chat") {
      analysisInstructions = "Please analyze the following content and provide:\n";
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
    }

    // Call DeepSeek API
    console.log("Making request to DeepSeek API...");
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
            content: type === "chat" ? content : `${analysisInstructions}\n\nContent to analyze:\n\n${content}`
          }
        ],
        temperature: type === "chat" ? 0.7 : 0.5,
        max_tokens: type === "chat" ? 2000 : 3000
      }),
    });

    console.log("DeepSeek API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error response:", errorText);
      
      // Parse the error to provide better user feedback
      let errorMessage = "Failed to process content with DeepSeek";
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        // If we can't parse the error, use the raw text
        errorMessage = errorText;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
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
