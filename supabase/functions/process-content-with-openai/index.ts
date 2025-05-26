
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingRequest {
  content: string;
  type: 'text' | 'video' | 'audio' | 'podcast';
  options?: {
    summary?: boolean;
    highlights?: boolean;
    keyPoints?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type, options = {} }: ProcessingRequest = await req.json();

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Processing ${type} content with OpenAI. Options:`, options);

    if (!content || content.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          error: 'Content too short for processing',
          processedContent: null
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build the system prompt based on options
    let systemPrompt = `You are an AI assistant that analyzes and processes content. `;
    let tasks = [];

    if (options.summary) {
      tasks.push("provide a comprehensive summary");
    }
    if (options.highlights) {
      tasks.push("extract key highlights and important points");
    }
    if (options.keyPoints) {
      tasks.push("identify the main key points");
    }

    if (tasks.length === 0) {
      tasks.push("provide a comprehensive summary and extract key highlights");
    }

    systemPrompt += `Please ${tasks.join(", ")} from the provided ${type} content. Format your response with clear sections using markdown headers.`;

    console.log('Making request to OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please analyze this ${type} content:\n\n${content}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    console.log(`OpenAI API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const processedContent = data.choices[0]?.message?.content;

    if (!processedContent) {
      throw new Error('No content received from OpenAI');
    }

    console.log('Content processed successfully');

    return new Response(
      JSON.stringify({ processedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Content processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process content',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
