
import { Mic } from "lucide-react";
import { AudioRecorder } from "@/components/audio/AudioRecorder";

interface SpeechToTextTabProps {
  onTranscriptExtracted: (content: string) => void;
}

export function SpeechToTextTab({ onTranscriptExtracted }: SpeechToTextTabProps) {
  const handleSpeechToText = (transcribedText: string) => {
    const enhancedContent = `# 🎤 Voice Note\n\n`;
    const timestamp = new Date().toLocaleString();
    
    let content = enhancedContent;
    content += `**Type:** Voice Transcription\n`;
    content += `**Recorded:** ${timestamp}\n`;
    content += `**Method:** Speech-to-Text AI (Supadata + Whisper Fallback)\n\n`;
    content += `---\n\n`;
    content += `## 📝 Transcription\n\n`;
    content += transcribedText;
    content += `\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...\n`;

    onTranscriptExtracted(content);
  };

  return (
    <div className="space-y-4 mt-4">
      <AudioRecorder 
        onTranscription={handleSpeechToText}
        className="w-full"
      />
      
      <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <Mic className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-green-700 dark:text-green-300">
          <p className="font-medium mb-1">Enhanced Speech-to-Text:</p>
          <p>Uses Supadata AI for premium transcription quality, with OpenAI Whisper as fallback for maximum reliability.</p>
        </div>
      </div>
    </div>
  );
}
