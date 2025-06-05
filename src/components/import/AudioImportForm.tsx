
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, Upload, FileAudio, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      setProcessingStatus('Creating note template...');

      const title = `Audio: ${selectedFile.name.replace(/\.[^/.]+$/, "")}`;
      const content = `# 🎵 ${title}\n\n**File:** ${selectedFile.name}\n**Size:** ${formatFileSize(selectedFile.size)}\n**Type:** Audio Note\n\n---\n\n## 📝 Notes\n\nAdd your notes about this audio file here...\n\n## 🎧 Summary\n\nAdd a summary of the audio content here...`;

      onContentImported({
        title,
        content,
        is_transcription: false
      });

      // Reset form
      setSelectedFile(null);
      setProcessingStatus('');
      
      toast({
        title: "✅ Audio Note Created",
        description: `Created note template for "${selectedFile.name}"`
      });

    } catch (error) {
      console.error('Audio import error:', error);
      setProcessingStatus('');
      
      toast({
        title: "Import Failed",
        description: error.message || "Failed to create audio note",
        variant: "destructive"
      });
    }
  };

  const handlePodcastImport = async () => {
    if (!podcastUrl.trim()) return;

    try {
      setProcessingStatus('Creating podcast note...');

      const title = `Podcast Episode`;
      const content = `# 🎙️ ${title}\n\n**Source:** ${podcastUrl}\n**Type:** Podcast Note\n\n---\n\n## 📝 Notes\n\nAdd your notes about this podcast episode here...\n\n## 🎧 Summary\n\nAdd a summary of the podcast content here...`;

      onContentImported({
        title,
        content,
        source_url: podcastUrl,
        is_transcription: false
      });

      // Reset form
      setPodcastUrl('');
      setProcessingStatus('');
      
      toast({
        title: "✅ Podcast Note Created",
        description: "Created podcast note template"
      });

    } catch (error) {
      console.error('Podcast import error:', error);
      setProcessingStatus('');
      
      toast({
        title: "Import Failed",
        description: error.message || "Failed to create podcast note",
        variant: "destructive"
      });
    }
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
                      Create Note
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
                <CheckCircle className="h-4 w-4 text-green-500" />
                {processingStatus}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
