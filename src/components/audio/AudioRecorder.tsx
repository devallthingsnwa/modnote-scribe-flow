
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, Download, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SpeechToTextService } from "@/lib/speechToTextService";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  className?: string;
}

export function AudioRecorder({ onTranscription, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptionProvider, setTranscriptionProvider] = useState<string>("");
  const [transcriptionAttempt, setTranscriptionAttempt] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current = recorder;
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
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
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      
      toast({
        title: "⏹️ Recording Stopped",
        description: `Recorded ${recordingDuration} seconds of audio`
      });
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscriptionProvider("");
    setTranscriptionAttempt(0);

    try {
      toast({
        title: "🔄 Enhanced Transcription Starting",
        description: "Using advanced AI with multiple fallbacks for best results..."
      });

      // Use enhanced retry mechanism
      const result = await SpeechToTextService.transcribeWithRetry(audioBlob, 3);
      
      if (result.success && result.text) {
        setTranscriptionProvider(result.provider || "unknown");
        
        const providerNames = {
          'supadata': 'Supadata AI',
          'openai-whisper': 'OpenAI Whisper (Edge)',
          'openai-direct': 'OpenAI Whisper (Direct)',
          'unknown': 'AI Provider'
        };
        
        const providerName = providerNames[result.provider as keyof typeof providerNames] || result.provider;
        
        toast({
          title: "✅ Transcription Complete!",
          description: `Successfully transcribed using ${providerName}${result.confidence ? ` (${Math.round(result.confidence * 100)}% confidence)` : ''}`
        });

        onTranscription(result.text);
        
        // Clear the recording after successful transcription
        clearRecording();
        
      } else {
        throw new Error(result.error || 'All transcription methods failed');
      }
    } catch (error) {
      console.error("Enhanced transcription error:", error);
      toast({
        title: "❌ Transcription Failed",
        description: "All transcription methods failed. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "💾 Audio Downloaded",
        description: "Your recording has been saved"
      });
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    setRecordingDuration(0);
    setTranscriptionProvider("");
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn("p-4", className)}>
      <CardContent className="space-y-4 p-0">
        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-3">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isTranscribing}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              size="lg"
              variant="destructive"
              className="animate-pulse"
            >
              <MicOff className="h-5 w-5 mr-2" />
              Stop Recording ({formatDuration(recordingDuration)})
            </Button>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-600">
              Recording in progress...
            </span>
          </div>
        )}

        {/* Audio Playback & Controls */}
        {audioBlob && (
          <div className="space-y-3 p-3 bg-muted/20 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={playAudio}
                  variant="outline"
                  size="sm"
                  disabled={isTranscribing}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Duration: {formatDuration(recordingDuration)}
                </span>
                
                {transcriptionProvider && (
                  <Badge variant="secondary" className="text-xs">
                    {transcriptionProvider === 'supadata' ? 'Supadata AI' : 
                     transcriptionProvider === 'openai-whisper' ? 'OpenAI Whisper (Edge)' : 
                     transcriptionProvider === 'openai-direct' ? 'OpenAI Whisper (Direct)' :
                     transcriptionProvider}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={downloadAudio}
                  variant="outline"
                  size="sm"
                  disabled={isTranscribing}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={clearRecording}
                  variant="outline"
                  size="sm"
                  disabled={isTranscribing}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Hidden audio element for playback */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
            )}
            
            {/* Enhanced Transcribe Button */}
            <Button
              onClick={transcribeAudio}
              disabled={isTranscribing || !audioBlob}
              className="w-full"
              size="lg"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transcribing with Enhanced AI...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Transcribe to Text (Enhanced)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Enhanced Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Click "Start Recording" to capture audio, then "Transcribe" to convert to text</p>
          <p>Enhanced system: Supadata AI → OpenAI Whisper (Edge) → OpenAI Whisper (Direct)</p>
          <p>Multiple fallbacks ensure maximum transcription success rate</p>
        </div>
      </CardContent>
    </Card>
  );
}
