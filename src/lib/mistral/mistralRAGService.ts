
import { supabase } from "@/integrations/supabase/client";

interface MistralRAGConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

interface RAGContext {
  query: string;
  relevantChunks: string[];
  sources: Array<{
    id: string;
    title: string;
    relevance: number;
    snippet: string;
  }>;
  totalTokens: number;
}

interface MistralRAGResponse {
  answer: string;
  sources: string[];
  confidence: number;
  processingTime: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class MistralRAGService {
  private static readonly DEFAULT_CONFIG: MistralRAGConfig = {
    model: 'mistral-large-latest',
    temperature: 0.1,
    maxTokens: 2000,
    topP: 0.95
  };

  static async processRAGQuery(
    context: RAGContext,
    config: Partial<MistralRAGConfig> = {}
  ): Promise<MistralRAGResponse> {
    const startTime = performance.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      console.log(`🧠 MISTRAL RAG: Processing query "${context.query}" with ${context.sources.length} sources`);

      const ragPrompt = this.buildRAGPrompt(context);
      
      const { data, error } = await supabase.functions.invoke('mistral-rag-processor', {
        body: {
          model: finalConfig.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: ragPrompt
            }
          ],
          temperature: finalConfig.temperature,
          max_tokens: finalConfig.maxTokens,
          top_p: finalConfig.topP
        }
      });

      if (error) {
        throw new Error(`Mistral API error: ${error.message}`);
      }

      const response = data.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from Mistral API');
      }

      const processingTime = performance.now() - startTime;
      
      console.log(`✅ MISTRAL RAG: Generated response in ${processingTime.toFixed(0)}ms`);

      return {
        answer: response,
        sources: context.sources.map(s => s.title),
        confidence: this.calculateResponseConfidence(response, context),
        processingTime,
        tokenUsage: data.usage || {
          promptTokens: ragPrompt.length / 4,
          completionTokens: response.length / 4,
          totalTokens: (ragPrompt.length + response.length) / 4
        }
      };

    } catch (error) {
      console.error('🚨 MISTRAL RAG ERROR:', error);
      throw new Error(`Mistral RAG processing failed: ${error.message}`);
    }
  }

  private static buildRAGPrompt(context: RAGContext): string {
    const sourcesList = context.sources
      .map((source, index) => 
        `SOURCE ${index + 1}: "${source.title}" (Relevance: ${source.relevance.toFixed(2)})\n${source.snippet}`
      )
      .join('\n\n---\n\n');

    return `QUERY: "${context.query}"

VERIFIED KNOWLEDGE BASE (${context.sources.length} sources, ${context.totalTokens} tokens):

${sourcesList}

CONTEXT DATA:
${context.relevantChunks.join('\n\n===NEXT_SOURCE===\n\n')}

INSTRUCTIONS:
1. Answer the query using ONLY the provided verified sources
2. Cite specific sources when referencing information
3. If sources conflict, acknowledge and cite each conflicting source
4. If the query cannot be fully answered from these sources, state this clearly
5. Maintain factual accuracy and cite source titles
6. Provide a comprehensive but concise response

RESPONSE FORMAT: Use "According to [Source Title]..." or "In [Source Title]..." when citing sources.`;
  }

  private static getSystemPrompt(): string {
    return `You are an advanced RAG (Retrieval-Augmented Generation) AI assistant powered by Mistral AI. You provide accurate, well-sourced answers based exclusively on the provided knowledge base.

CORE PRINCIPLES:
1. STRICT SOURCE ADHERENCE: Use only information from the provided verified sources
2. ACCURATE CITATIONS: Always cite specific source titles when referencing information
3. FACTUAL PRECISION: Never invent or hallucinate information
4. CONFLICT RESOLUTION: When sources disagree, present all perspectives with proper citations
5. TRANSPARENCY: Clearly state when information is not available in the sources

RESPONSE QUALITY:
- Comprehensive yet concise answers
- Clear structure with proper citations
- Professional and helpful tone
- Acknowledgment of limitations when sources are insufficient

CITATION FORMAT:
- "According to [Source Title]..."
- "As mentioned in [Source Title]..."
- "Based on information from [Source Title]..."`;
  }

  private static calculateResponseConfidence(response: string, context: RAGContext): number {
    let confidence = 0.5;

    // Length and detail indicators
    if (response.length > 200) confidence += 0.1;
    if (response.length > 500) confidence += 0.1;

    // Citation indicators
    const citationCount = (response.match(/According to|As mentioned in|Based on/gi) || []).length;
    confidence += Math.min(citationCount * 0.1, 0.3);

    // Source utilization
    const sourceUtilization = context.sources.length > 0 ? Math.min(citationCount / context.sources.length, 1) : 0;
    confidence += sourceUtilization * 0.2;

    // Quality indicators
    if (/\d+/.test(response)) confidence += 0.05;
    if (/[.!?]{2,}/.test(response)) confidence += 0.05;

    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  static async enhanceQueryWithMistral(query: string): Promise<string> {
    try {
      console.log('🔍 MISTRAL: Enhancing search query for better RAG results');

      const { data, error } = await supabase.functions.invoke('mistral-query-enhancement', {
        body: {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: `You are a query enhancement AI. Improve search queries to get better RAG results.

TASKS:
1. Expand abbreviated terms
2. Add relevant synonyms and related concepts
3. Clarify ambiguous terms
4. Maintain original intent
5. Optimize for semantic search

RULES:
- Keep the enhanced query concise (max 2-3x original length)
- Preserve the core question/intent
- Add context that would help find relevant documents
- Don't change the meaning

OUTPUT: Return only the enhanced query, nothing else.`
            },
            {
              role: 'user',
              content: `Enhance this search query: "${query}"`
            }
          ],
          temperature: 0.2,
          max_tokens: 200
        }
      });

      if (error || !data?.choices?.[0]?.message?.content) {
        console.warn('Query enhancement failed, using original query');
        return query;
      }

      const enhancedQuery = data.choices[0].message.content.trim();
      console.log(`✅ MISTRAL: Query enhanced from "${query}" to "${enhancedQuery}"`);
      
      return enhancedQuery;

    } catch (error) {
      console.warn('Query enhancement error:', error);
      return query;
    }
  }
}
