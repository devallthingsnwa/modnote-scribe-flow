
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
    const { title, url } = metadata;
    
    // Format the current date and time
    const now = new Date();
    const importDate = now.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    const importTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    let formattedContent = `# 🎥 ${title}\n\n`;
    formattedContent += `**Source:** ${url}\n`;
    formattedContent += `**Type:** Video Transcript\n`;
    formattedContent += `**Imported:** ${importDate}, ${importTime}\n\n`;
    formattedContent += `---\n\n`;
    formattedContent += `## 📝 Transcript\n\n`;
    
    // Preserve raw transcript format with minimal cleaning
    const rawTranscript = this.preserveRawTranscriptFormat(transcript.text);
    formattedContent += rawTranscript;
    
    // Add personal notes section
    formattedContent += `\n\n---\n\n`;
    formattedContent += `## 📝 My Notes\n\n`;
    formattedContent += `Add your personal notes and thoughts here...`;
    
    return formattedContent;
  }

  private static preserveRawTranscriptFormat(text: string): string {
    // Minimal cleaning - preserve timestamp markers like [음악], [박수], etc.
    // Keep natural word flow and comma separations
    
    // Remove only excessive whitespace but preserve natural breaks
    let cleaned = text.replace(/\s{3,}/g, ' '); // Replace 3+ spaces with single space
    
    // Preserve timestamp markers in brackets like [음악], [박수]
    // Keep comma-separated word format
    // Maintain natural line breaks
    
    // Remove extra whitespace at start/end only
    cleaned = cleaned.trim();
    
    // Return as-is to preserve the raw transcript style
    return cleaned;
  }

  static formatFallbackNote(url: string, videoId?: string): string {
    const title = videoId ? `YouTube Video ${videoId}` : 'YouTube Video';
    
    // Format the current date and time
    const now = new Date();
    const importDate = now.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    const importTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    let content = `# 🎥 ${title}\n\n`;
    content += `**Source:** ${url}\n`;
    content += `**Type:** Video Transcript\n`;
    content += `**Imported:** ${importDate}, ${importTime}\n`;
    content += `**Status:** ⚠️ Transcript unavailable\n\n`;
    content += `---\n\n`;
    content += `## 📝 Transcript\n\n`;
    content += `Transcript could not be extracted for this video.\n\n`;
    content += `---\n\n`;
    content += `## 📝 My Notes\n\n`;
    content += `Add your personal notes and thoughts here...\n\n`;
    content += `- Key points:\n`;
    content += `- Important moments:\n`;
    content += `- Personal thoughts:\n`;
    
    return content;
  }
}
