
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
    const { content, type, options, stream = false } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    console.log(`Processing ${type} content with DeepSeek. Stream: ${stream}`);
    
    // Prepare optimized system prompt
    let systemPrompt = "You are an expert AI assistant that provides concise, accurate responses.";
    let analysisInstructions = "";
    
    if (type === "chat" && options?.rag) {
      systemPrompt = "You are an advanced AI assistant with RAG capabilities. Provide helpful, accurate responses based on the provided context. Be concise but comprehensive.";
      analysisInstructions = "Using the provided context, give a clear and helpful response. Reference specific information when relevant.";
    } else if (type === "video" || type === "audio") {
      systemPrompt = "You are an expert content analyst. Provide clear, structured analysis of media content.";
    } else if (type === "text") {
      systemPrompt = "You are an expert content analyst. Extract key insights and provide structured summaries.";
    }

    // Build optimized analysis prompt
    if (type !== "chat") {
      analysisInstructions = "Analyze the content and provide:\n";
      const requestedAnalysis = [];
      
      if (options?.summary) {
        requestedAnalysis.push("• **Summary**: Key points and main topics");
      }
      
      if (options?.highlights) {
        requestedAnalysis.push("• **Highlights**: Most important insights");
      }
      
      if (options?.keyPoints) {
        requestedAnalysis.push("• **Key Points**: Main takeaways");
      }
      
      if (requestedAnalysis.length === 0) {
        analysisInstructions += "A comprehensive analysis with summary and key insights.";
      } else {
        analysisInstructions += requestedAnalysis.join("\n");
      }
      
      analysisInstructions += "\n\nUse clear formatting and be concise.";
    }

    // Prepare API request body
    const requestBody = {
      model: "deepseek-chat",
      messages: [
        {
          role: "system", 
          content: systemPrompt
        },
        {
          role: "user",
          content: type === "chat" ? content : `${analysisInstructions}\n\nContent:\n\n${content}`
        }
      ],
      temperature: type === "chat" ? 0.7 : 0.5,
      max_tokens: type === "chat" ? 1500 : 2000,
      stream: stream
    };

    console.log("Making request to DeepSeek API...");
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("DeepSeek API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error response:", errorText);
      
      let errorMessage = "Failed to process content with DeepSeek";
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
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

    // Handle streaming response
    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle regular response
    const data = await response.json();
    const processedContent = data.choices?.[0]?.message?.content || "No processed content available.";

    console.log("Content processed successfully with DeepSeek");
    
    return new Response(
      JSON.stringify({ 
        processedContent,
        usage: data.usage, // Include token usage info
        model: data.model
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
