
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingRequest {
  content: string;
  type: 'text' | 'video' | 'audio' | 'podcast' | 'chat';
  prompt?: string;
  options?: {
    summary?: boolean;
    highlights?: boolean;
    keyPoints?: boolean;
    conversational?: boolean;
    helpful?: boolean;
    educational?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type, prompt, options = {} }: ProcessingRequest = await req.json();

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

    let systemPrompt = '';
    let userContent = '';

    if (type === 'chat') {
      // Handle chat/conversational requests
      systemPrompt = `You are an AI learning assistant that helps students understand content better. You are helpful, educational, and conversational. 
      
      When answering questions:
      - Provide clear, concise explanations
      - Use examples when helpful
      - Break down complex concepts
      - Encourage learning and curiosity
      - Reference the provided content when relevant
      
      Always be supportive and encouraging in your responses.`;
      
      userContent = `Based on this content: ${content}\n\nUser question: ${prompt}`;
    } else {
      // Handle content processing requests
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

      systemPrompt = `You are an AI assistant that analyzes and processes content. Please ${tasks.join(", ")} from the provided ${type} content. Format your response with clear sections using markdown headers.`;
      userContent = `Please analyze this ${type} content:\n\n${content}`;
    }

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
            content: userContent
          }
        ],
        max_tokens: type === 'chat' ? 1000 : 2000,
        temperature: type === 'chat' ? 0.9 : 0.7,
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
