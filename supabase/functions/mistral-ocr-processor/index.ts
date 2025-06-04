
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { extractedText, fileName, fileType } = await req.json();
    
    if (!extractedText) {
      return new Response(
        JSON.stringify({ error: "Extracted text is required" }),
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

    console.log(`🤖 Processing OCR text with Mistral AI for file: ${fileName}`);
    
    // Create specialized prompt based on file type
    let systemPrompt = "You are an expert document processor. Analyze the OCR-extracted text and improve its structure and readability.";
    let userPrompt = `Please process this OCR-extracted text from "${fileName}" and improve it by:

1. **Cleaning and Structuring**: Fix OCR errors, improve formatting, and organize content logically
2. **Content Enhancement**: Identify key sections, headings, and important information
3. **Data Extraction**: Extract any structured data like tables, lists, dates, names, or key metrics
4. **Summary**: Provide a brief overview of the document's main content

Original OCR Text:
${extractedText}

Please return the processed content in this markdown format:
# 📄 Document Analysis: [Document Title/Type]

## 📝 Cleaned Content
[Improved and structured version of the text]

## 🔍 Key Information Extracted
[Important data points, dates, names, numbers, etc.]

## 📊 Structured Data
[Any tables, lists, or organized information found]

## 📋 Summary
[Brief overview of the document's main content and purpose]`;

    // Adjust prompt based on file type
    if (fileType === 'application/pdf') {
      systemPrompt += " Focus on preserving document structure and formatting from PDFs.";
    } else if (fileType?.startsWith('image/')) {
      systemPrompt += " This text was extracted from an image, so be especially careful about OCR errors and missing context.";
    }

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
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
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mistral AI API error:", errorText);
      
      let errorMessage = "Failed to process document with Mistral AI";
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

    const data = await response.json();
    const processedContent = data.choices?.[0]?.message?.content || "No processed content available.";

    console.log(`✅ Document processed successfully with Mistral AI`);
    
    return new Response(
      JSON.stringify({ 
        processedContent,
        usage: data.usage,
        model: data.model,
        fileName,
        fileType
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mistral-ocr-processor function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing the document with Mistral AI",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
