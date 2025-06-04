
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
    const requestBody = await req.json();
    const { content, type, options = {}, stream = false } = requestBody;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    
    if (!MISTRAL_API_KEY) {
      console.error("MISTRAL_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Mistral API key is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${type} content with Mistral AI. Stream: ${stream}, Fast mode: ${options.fast_mode || false}`);
    
    // System prompts for different content types
    let systemPrompt = "You are a helpful AI assistant. Be concise and accurate.";
    let userPrompt = content;
    
    if (type === "chat" && options.rag) {
      systemPrompt = "You are an AI assistant with access to user notes. Provide helpful, concise responses based on the context.";
      userPrompt = content;
    } else if (type === "video" || type === "audio") {
      systemPrompt = "You are a content analyst. Provide clear, structured analysis.";
      userPrompt = `Analyze this content and provide key insights:\n\n${content}`;
    } else if (type === "text") {
      systemPrompt = "You are a content analyst. Extract key insights efficiently.";
      
      const analysisRequests = [];
      if (options.summary) analysisRequests.push("• **Summary**: Key points");
      if (options.highlights) analysisRequests.push("• **Highlights**: Important insights");
      if (options.keyPoints) analysisRequests.push("• **Key Points**: Main takeaways");
      
      if (analysisRequests.length > 0) {
        userPrompt = `Analyze the content and provide:\n${analysisRequests.join("\n")}\n\nContent:\n\n${content}`;
      } else {
        userPrompt = `Provide a concise analysis with key insights:\n\n${content}`;
      }
    }

    // Model selection for speed optimization
    const isFastMode = options.fast_mode === true;
    const modelToUse = isFastMode ? "mistral-small-latest" : "mistral-large-latest";
    const maxTokens = isFastMode ? 800 : (type === "chat" ? 1200 : 1800);
    const temperature = isFastMode ? 0.3 : (type === "chat" ? 0.7 : 0.5);

    // Prepare API request
    const apiRequestBody = {
      model: modelToUse,
      messages: [
        {
          role: "system", 
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream
    };

    console.log(`Making request to Mistral AI API (${modelToUse})...`);
    
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify(apiRequestBody),
    });

    console.log("Mistral AI API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mistral AI API error:", errorText);
      
      let errorMessage = "Failed to process content with Mistral AI";
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

    console.log(`Content processed successfully with Mistral AI (${modelToUse})`);
    
    return new Response(
      JSON.stringify({ 
        processedContent,
        usage: data.usage,
        model: data.model,
        optimized: isFastMode
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-content-with-mistral function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing content with Mistral AI",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
