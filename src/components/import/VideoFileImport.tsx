
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Video, Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedTranscriptionService, type EnhancedTranscriptionResult } from '@/lib/transcription/enhancedTranscriptionService';

interface VideoFileImportProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading: boolean;
}

export function VideoFileImport({ onContentImported, isLoading }: VideoFileImportProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [transcriptionResult, setTranscriptionResult] = useState<EnhancedTranscriptionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, WebM, OGG, AVI, MOV)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a video file smaller than 100MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadProgress(0);
      setProcessingStatus('Uploading video file...');
      setUploadProgress(25);

      setProcessingStatus('Extracting audio from video...');
      setUploadProgress(50);

      setProcessingStatus('Transcribing with speaker detection...');
      setUploadProgress(75);

      const result = await EnhancedTranscriptionService.transcribeVideoFile(file);
      
      if (result.success) {
        setTranscriptionResult(result);
        setProcessingStatus('Transcription complete!');
        setUploadProgress(100);

        // Format the content
        const title = `Video Transcript: ${file.name}`;
        let content = `# 🎬 ${title}\n\n`;
        content += `**Source:** Local video file\n`;
        content += `**File:** ${file.name}\n`;
        content += `**Size:** ${(file.size / (1024 * 1024)).toFixed(1)} MB\n`;
        content += `**Type:** Enhanced Transcription\n`;
        content += `**Processed:** ${new Date().toLocaleString()}\n`;
        
        if (result.metadata) {
          content += `**Duration:** ${Math.floor(result.metadata.duration / 60)}:${String(Math.floor(result.metadata.duration % 60)).padStart(2, '0')}\n`;
          content += `**Speakers Detected:** ${result.metadata.speakerCount || 1}\n`;
          content += `**Audio Quality:** ${result.metadata.audioQuality}\n`;
          content += `**Language:** ${result.metadata.language}\n`;
        }
        
        content += `\n---\n\n## 📝 Transcript\n\n`;
        
        if (result.speakers && result.speakers.length > 0) {
          content += EnhancedTranscriptionService.formatTranscriptWithSpeakers(result.speakers);
        } else {
          content += EnhancedTranscriptionService.cleanTranscriptText(result.text);
        }

        onContentImported({
          title,
          content,
          is_transcription: true
        });

        toast({
          title: "✅ Video Transcription Complete",
          description: `Successfully transcribed "${file.name}" with ${result.metadata?.speakerCount || 1} speaker(s) detected`
        });

        // Reset form
        setUploadProgress(0);
        setProcessingStatus('');
        setTranscriptionResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } else {
        throw new Error(result.error || 'Transcription failed');
      }

    } catch (error) {
      console.error('Video transcription error:', error);
      setUploadProgress(0);
      setProcessingStatus('');
      
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe video file",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          Upload Video File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        
        <Button
          onClick={handleFileSelect}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Select Video File
            </>
          )}
        </Button>

        {processingStatus && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {uploadProgress === 100 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {processingStatus}
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {transcriptionResult && transcriptionResult.metadata && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {transcriptionResult.metadata.speakerCount} Speaker(s)
              </Badge>
              <Badge variant="outline" className="text-xs">
                {transcriptionResult.metadata.audioQuality} Quality
              </Badge>
              <Badge variant="outline" className="text-xs">
                {transcriptionResult.metadata.language}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Video className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Enhanced Video Transcription:</p>
            <p>Supports MP4, WebM, AVI, MOV files up to 100MB. Features automatic speaker detection, noise reduction, and intelligent formatting.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
