
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Square, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SpeechToTextService } from "@/lib/speechToTextService";

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  className?: string;
}

export function AudioRecorder({ onTranscription, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      if (audioPlayer.current) {
        audioPlayer.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);
      
      toast({
        title: "🎤 Recording Started",
        description: "Speak clearly into your microphone"
      });
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "❌ Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      toast({
        title: "⏹️ Recording Stopped",
        description: "Processing audio for transcription..."
      });
    }
  };

  const playRecording = () => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayer.current = new Audio(audioUrl);
      
      audioPlayer.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audioPlayer.current.play();
      setIsPlaying(true);
    } else if (audioPlayer.current && isPlaying) {
      audioPlayer.current.pause();
      setIsPlaying(false);
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    
    try {
      const result = await SpeechToTextService.transcribeAudio(audioBlob);
      
      if (result.success && result.text) {
        onTranscription(result.text);
        setAudioBlob(null); // Clear after successful transcription
        
        toast({
          title: "✅ Transcription Complete",
          description: `Converted ${result.text.length} characters of text`
        });
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
      
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        title: "❌ Transcription Failed",
        description: "Could not convert speech to text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    if (audioPlayer.current) {
      audioPlayer.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <h3 className="font-medium mb-2">🎤 Speech to Text</h3>
          <p className="text-sm text-muted-foreground">
            Record your voice and convert it to text
          </p>
        </div>

        <div className="flex justify-center space-x-2">
          {!isRecording ? (
            <Button 
              onClick={startRecording}
              disabled={isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button 
              onClick={stopRecording}
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {audioBlob && !isRecording && (
          <div className="space-y-3">
            <div className="flex justify-center space-x-2">
              <Button 
                onClick={playRecording}
                variant="outline"
                size="sm"
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              <Button 
                onClick={transcribeAudio}
                disabled={isProcessing}
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 mr-1" />
                    Transcribe
                  </>
                )}
              </Button>
              
              <Button 
                onClick={clearRecording}
                variant="ghost"
                size="sm"
              >
                Clear
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Audio recorded • Ready for transcription
            </p>
          </div>
        )}

        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-red-500">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
