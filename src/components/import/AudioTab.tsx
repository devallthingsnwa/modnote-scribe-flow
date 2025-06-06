
import { Button } from "@/components/ui/button";
import { Mic, Upload } from "lucide-react";

interface AudioTabProps {
  isRecording: boolean;
  isProcessing: boolean;
  onVoiceRecording: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AudioTab({ isRecording, isProcessing, onVoiceRecording, onFileUpload }: AudioTabProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <Button
          onClick={onVoiceRecording}
          variant={isRecording ? "destructive" : "outline"}
          size="lg"
          className={`w-full ${isRecording ? 'animate-pulse bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-[#1c1c1c] hover:bg-[#2a2a2a] text-white border-[#333]'}`}
          disabled={isProcessing && !isRecording}
        >
          <Mic className="h-5 w-5 mr-2" />
          {isRecording ? "Stop Recording" : "Start Voice Recording"}
        </Button>
        {isRecording && (
          <p className="text-sm text-white">
            🎤 Recording in progress... Click "Stop Recording" when done
          </p>
        )}
        
        <div className="border-2 border-dashed border-[#333] rounded-lg p-8 text-center hover:border-[#444] transition-colors bg-[#151515]/50 relative">
          <Upload className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <div className="space-y-2">
            <p className="text-sm text-white">Or upload audio files</p>
            <p className="text-xs text-gray-400">Supports MP3, WAV, M4A files</p>
          </div>
          <input
            type="file"
            onChange={onFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".mp3,.wav,.m4a,.mp4"
          />
        </div>
      </div>
    </div>
  );
}
