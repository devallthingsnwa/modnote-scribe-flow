
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, Upload, FileAudio, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TranscriptionService } from '@/lib/transcriptionService';

interface AudioImportFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading: boolean;
}

export function AudioImportForm({ onContentImported, isLoading }: AudioImportFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [podcastUrl, setPodcastUrl] = useState('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate audio file types
      const validTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select an audio file (MP3, WAV, M4A, AAC, OGG)",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileImport = async () => {
    if (!selectedFile) return;

    try {
      setProcessingStatus('Uploading audio file...');
      setTranscriptionProgress(25);

      // Convert file to base64 for API transmission
      const base64Audio = await fileToBase64(selectedFile);
      
      setProcessingStatus('Transcribing audio with AI...');
      setTranscriptionProgress(50);

      // Use external providers for audio transcription
      const transcriptionResult = await TranscriptionService.transcribeWithFallback(base64Audio);
      
      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Audio transcription failed');
      }

      setProcessingStatus('Processing complete!');
      setTranscriptionProgress(100);

      const title = `Audio: ${selectedFile.name.replace(/\.[^/.]+$/, "")}`;
      const content = `# 🎵 ${title}\n\n**File:** ${selectedFile.name}\n**Size:** ${formatFileSize(selectedFile.size)}\n**Type:** Audio Transcription\n\n---\n\n## 📝 Transcript\n\n${transcriptionResult.text}`;

      onContentImported({
        title,
        content,
        is_transcription: true
      });

      // Reset form
      setSelectedFile(null);
      setProcessingStatus('');
      setTranscriptionProgress(0);
      
      toast({
        title: "✅ Audio Transcribed",
        description: `Successfully transcribed "${selectedFile.name}" using ${transcriptionResult.provider}`
      });

    } catch (error) {
      console.error('Audio import error:', error);
      setProcessingStatus('');
      setTranscriptionProgress(0);
      
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe audio file",
        variant: "destructive"
      });
    }
  };

  const handlePodcastImport = async () => {
    if (!podcastUrl.trim()) return;

    try {
      setProcessingStatus('Fetching podcast episode...');
      setTranscriptionProgress(25);

      // Detect media type and validate URL
      const mediaType = TranscriptionService.detectMediaType(podcastUrl);
      if (mediaType === 'unknown') {
        throw new Error('Unsupported podcast URL format');
      }

      setProcessingStatus('Transcribing podcast with Podsqueeze...');
      setTranscriptionProgress(50);

      // Use transcription service with podcast-optimized settings
      const transcriptionResult = await TranscriptionService.transcribeWithFallback(podcastUrl);
      
      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Podcast transcription failed');
      }

      setProcessingStatus('Processing complete!');
      setTranscriptionProgress(100);

      const title = transcriptionResult.metadata?.title || `Podcast Episode`;
      const content = `# 🎙️ ${title}\n\n**Source:** ${podcastUrl}\n**Duration:** ${transcriptionResult.metadata?.duration || 'Unknown'}\n**Type:** Podcast Transcript\n\n---\n\n## 📝 Transcript\n\n${transcriptionResult.text}`;

      onContentImported({
        title,
        content,
        source_url: podcastUrl,
        is_transcription: true
      });

      // Reset form
      setPodcastUrl('');
      setProcessingStatus('');
      setTranscriptionProgress(0);
      
      toast({
        title: "✅ Podcast Transcribed",
        description: `Successfully transcribed podcast using ${transcriptionResult.provider}`
      });

    } catch (error) {
      console.error('Podcast import error:', error);
      setProcessingStatus('');
      setTranscriptionProgress(0);
      
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe podcast",
        variant: "destructive"
      });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:audio/...;base64, prefix
        resolve(base64.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-purple-500" />
            Upload Audio File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={isLoading}
            />
            {selectedFile && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button 
                  onClick={handleFileImport}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Transcribe
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Podcast URL Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-500" />
            Import Podcast URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://anchor.fm/episode/... or Spotify podcast URL"
              value={podcastUrl}
              onChange={(e) => setPodcastUrl(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handlePodcastImport}
              disabled={isLoading || !podcastUrl.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Import'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {processingStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {transcriptionProgress === 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {processingStatus}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${transcriptionProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
