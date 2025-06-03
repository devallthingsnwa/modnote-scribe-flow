export interface VideoMetadata {
  title: string;
  author: string;
  duration: string;
  url: string;
}

export interface TranscriptData {
  text: string;
  segments?: Array<{
    text: string;
    startTime?: number;
    endTime?: number;
  }>;
}

export class TranscriptFormatter {
  static formatEnhancedTranscript(
    metadata: VideoMetadata,
    transcript: TranscriptData
  ): string {
    const { title, author, duration, url } = metadata;
    
    let formattedContent = `# 🎥 ${title}\n\n`;
    formattedContent += `**Source:** ${url}\n`;
    formattedContent += `**Author:** ${author}\n`;
    formattedContent += `**Duration:** ${duration}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 Transcript\n\n`;
    
    // Clean and format transcript text
    const cleanedTranscript = this.cleanTranscriptText(transcript.text);
    formattedContent += cleanedTranscript;
    
    return formattedContent;
  }

  private static cleanTranscriptText(text: string): string {
    // Remove timestamp brackets like [MM:SS - MM:SS] but keep the content
    let cleaned = text.replace(/\[(\d{2}:\d{2}(?:\.\d{3})?)\s*-\s*(\d{2}:\d{2}(?:\.\d{3})?)\]\s*/g, '');
    
    // Clean up multiple spaces and normalize
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove extra whitespace at start/end
    cleaned = cleaned.trim();
    
    // Format as continuous text with proper spacing
    return cleaned;
  }

  static formatFallbackNote(url: string, videoId?: string): string {
    const title = videoId ? `YouTube Video ${videoId}` : 'YouTube Video';
    
    let content = `# 🎥 ${title}\n\n`;
    content += `**Source:** ${url}\n`;
    content += `**Author:** Unknown\n`;
    content += `**Duration:** Unknown\n`;
    content += `**Status:** ⚠️ Transcript unavailable\n\n`;
    content += `---\n\n`;
    content += `## 📝 Notes\n\n`;
    content += `Transcript could not be extracted for this video. Add your own notes here:\n\n`;
    content += `- Key points:\n`;
    content += `- Important moments:\n`;
    content += `- Personal thoughts:\n`;
    
    return content;
  }
}
