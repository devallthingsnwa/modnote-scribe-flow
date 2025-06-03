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
    formattedContent += `## 📝 Raw Transcript\n\n`;
    
    // Preserve raw transcript format with minimal cleaning
    const rawTranscript = this.preserveRawTranscriptFormat(transcript.text);
    formattedContent += rawTranscript;
    
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
