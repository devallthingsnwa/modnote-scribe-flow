
import { supabase } from '@/integrations/supabase/client';
import { SemanticSearchEngine } from '@/lib/vectorSearch/semanticSearchEngine';

interface DocumentProcessingResult {
  success: boolean;
  noteId?: string;
  error?: string;
}

export class DocumentProcessor {
  /**
   * Complete document processing pipeline:
   * 1. Store document in Supabase
   * 2. Extract and chunk text
   * 3. Generate embeddings
   * 4. Store embeddings in Pinecone
   */
  static async processDocument(
    file: File,
    userId: string,
    title?: string
  ): Promise<DocumentProcessingResult> {
    try {
      console.log('📄 Processing document:', file.name);

      // Step 1: Extract text content (this would need OCR/PDF parsing)
      const textContent = await this.extractTextFromFile(file);
      
      // Step 2: Store note in Supabase
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: title || file.name,
          content: textContent,
          is_transcription: false
        })
        .select()
        .single();

      if (noteError) throw noteError;

      console.log('✅ Note saved to Supabase:', noteData.id);

      // Step 3: Index in Pinecone for semantic search
      await SemanticSearchEngine.indexNote(
        noteData.id,
        noteData.title,
        textContent,
        'note'
      );

      return {
        success: true,
        noteId: noteData.id
      };

    } catch (error) {
      console.error('❌ Document processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process YouTube video/transcript
   */
  static async processVideoTranscript(
    videoUrl: string,
    userId: string,
    transcript: string,
    metadata: any
  ): Promise<DocumentProcessingResult> {
    try {
      console.log('🎥 Processing video transcript:', metadata.title);

      // Store video note in Supabase
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: metadata.title || 'YouTube Video',
          content: transcript,
          source_url: videoUrl,
          thumbnail: metadata.thumbnail,
          is_transcription: true
        })
        .select()
        .single();

      if (noteError) throw noteError;

      console.log('✅ Video note saved to Supabase:', noteData.id);

      // Index in Pinecone
      await SemanticSearchEngine.indexNote(
        noteData.id,
        noteData.title,
        transcript,
        'video'
      );

      return {
        success: true,
        noteId: noteData.id
      };

    } catch (error) {
      console.error('❌ Video processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store chat conversation
   */
  static async storeChatHistory(
    userId: string,
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>
  ): Promise<boolean> {
    try {
      const conversationTitle = `Chat - ${new Date().toLocaleDateString()}`;
      const conversationContent = messages
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: conversationTitle,
          content: conversationContent,
          is_transcription: false
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Chat history saved:', data.id);

      // Index conversation for future retrieval
      await SemanticSearchEngine.indexNote(
        data.id,
        conversationTitle,
        conversationContent,
        'note'
      );

      return true;
    } catch (error) {
      console.error('❌ Error storing chat history:', error);
      return false;
    }
  }

  private static async extractTextFromFile(file: File): Promise<string> {
    // Basic text extraction - in production, you'd want OCR for PDFs, images
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    if (file.type === 'application/json') {
      const content = await file.text();
      return JSON.stringify(JSON.parse(content), null, 2);
    }

    // For PDFs, images, etc., you'd integrate with OCR services
    // For now, return filename as placeholder
    return `Document: ${file.name}\nSize: ${file.size} bytes\nType: ${file.type}`;
  }
}
