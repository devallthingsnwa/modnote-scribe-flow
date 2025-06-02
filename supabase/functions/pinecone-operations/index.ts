
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PineconeVector {
  id: string;
  values: number[];
  metadata: {
    noteId: string;
    title: string;
    content: string;
    sourceType: 'video' | 'note';
    createdAt: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINECONE_API_KEY = Deno.env.get("PINECONE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not configured");
    }
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const operation = url.pathname.split('/').pop();
    const body = await req.json();

    const PINECONE_INDEX_HOST = "https://notes-embeddings-YOUR_PROJECT_ID.svc.YOUR_ENVIRONMENT.pinecone.io";
    
    switch (operation) {
      case 'generate-embedding':
        return await generateEmbedding(body.text, OPENAI_API_KEY);
      
      case 'pinecone-upsert':
        return await upsertVectors(body.vectors, PINECONE_API_KEY, PINECONE_INDEX_HOST);
      
      case 'pinecone-query':
        return await queryVectors(body, PINECONE_API_KEY, PINECONE_INDEX_HOST);
      
      case 'pinecone-delete':
        return await deleteVectors(body.noteId, PINECONE_API_KEY, PINECONE_INDEX_HOST);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error("Error in Pinecone operations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateEmbedding(text: string, apiKey: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float"
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ embedding: data.data[0].embedding }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

async function upsertVectors(vectors: PineconeVector[], apiKey: string, indexHost: string) {
  try {
    const response = await fetch(`${indexHost}/vectors/upsert`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vectors: vectors,
        namespace: "notes"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinecone upsert error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ success: true, upsertedCount: data.upsertedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error upserting vectors:", error);
    throw error;
  }
}

async function queryVectors(queryData: any, apiKey: string, indexHost: string) {
  try {
    const response = await fetch(`${indexHost}/query`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: queryData.vector,
        topK: queryData.topK || 10,
        includeMetadata: queryData.includeMetadata || true,
        namespace: "notes"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinecone query error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error querying vectors:", error);
    throw error;
  }
}

async function deleteVectors(noteId: string, apiKey: string, indexHost: string) {
  try {
    // Delete all chunks for this note
    const response = await fetch(`${indexHost}/vectors/delete`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          "noteId": { "$eq": noteId }
        },
        namespace: "notes"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinecone delete error: ${response.statusText} - ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting vectors:", error);
    throw error;
  }
}
