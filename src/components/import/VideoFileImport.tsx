
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, Loader2, CheckCircle, AlertCircle, FileVideo, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedTranscriptionService, EnhancedTranscriptionResult } from '@/lib/transcription/enhancedTranscriptionService';
import { Switch } from '@/components/ui/switch';

interface VideoFileImportProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function VideoFileImport({ onContentImported, isLoading }: VideoFileImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<EnhancedTranscriptionResult | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  
  // Transcription options
  const [enableSpeakerDetection, setEnableSpeakerDetection] = useState(true);
  const [addParagraphBreaks, setAddParagraphBreaks] = useState(true);
  const [filterFillerWords, setFilterFillerWords] = useState(true);
  const [noiseReduction, setNoiseReduction] = useState(true);
  
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a video file (MP4, MOV, AVI, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a video file smaller than 100MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setTranscriptionResult(null);
    }
  }, [toast]);

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setTranscriptionResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      setProcessingStage('Extracting audio from video...');
      
      const result = await EnhancedTranscriptionService.transcribeVideoFile(selectedFile, {
        enableSpeakerDetection,
        addParagraphBreaks,
        filterFillerWords,
        noiseReduction,
        language: 'auto'
      });

      clearInterval(progressInterval);
      setProgress(100);
      setProcessingStage('Transcription complete!');

      if (result.success) {
        setTranscriptionResult(result);
        toast({
          title: "Video Transcribed Successfully",
          description: `Processed ${selectedFile.name} with ${result.metadata?.speakerCount || 0} speakers detected`,
        });
      } else {
        throw new Error(result.error || 'Transcription failed');
      }

    } catch (error) {
      console.error('Video transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe video file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProcessingStage('');
    }
  };

  const handleImport = () => {
    if (!transcriptionResult || !selectedFile) return;

    const currentDate = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let formattedContent = `# 🎬 "${selectedFile.name}"\n\n`;
    formattedContent += `**Type:** Video Transcription\n`;
    formattedContent += `**File:** ${selectedFile.name}\n`;
    formattedContent += `**Size:** ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB\n`;
    formattedContent += `**Processed:** ${currentDate}\n`;
    
    if (transcriptionResult.metadata) {
      formattedContent += `**Speakers:** ${transcriptionResult.metadata.speakerCount}\n`;
      formattedContent += `**Confidence:** ${(transcriptionResult.metadata.confidence * 100).toFixed(1)}%\n`;
      formattedContent += `**Language:** ${transcriptionResult.metadata.language}\n`;
    }
    
    formattedContent += `\n---\n\n## 📝 Transcript\n\n`;
    formattedContent += transcriptionResult.transcript;
    formattedContent += `\n\n---\n\n## 📝 My Notes\n\n`;
    formattedContent += `Add your personal notes and thoughts here...\n`;

    onContentImported({
      title: selectedFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      content: formattedContent,
      is_transcription: true
    });

    // Reset form
    setSelectedFile(null);
    setTranscriptionResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Video File Transcription</h3>
        <p className="text-muted-foreground text-sm">
          Upload video files and get enhanced transcripts with speaker detection
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-4">
        <Label htmlFor="video-upload">Select Video File</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
          <label
            htmlFor="video-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Click to upload video file</p>
              <p className="text-xs text-muted-foreground">MP4, MOV, AVI, WebM (max 100MB)</p>
            </div>
          </label>
        </div>

        {selectedFile && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileVideo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transcription Options */}
      {selectedFile && !isProcessing && !transcriptionResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Transcription Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Speaker Detection</Label>
                <p className="text-xs text-muted-foreground">Identify different speakers</p>
              </div>
              <Switch
                checked={enableSpeakerDetection}
                onCheckedChange={setEnableSpeakerDetection}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Paragraph Breaks</Label>
                <p className="text-xs text-muted-foreground">Add natural breaks in text</p>
              </div>
              <Switch
                checked={addParagraphBreaks}
                onCheckedChange={setAddParagraphBreaks}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Filter Filler Words</Label>
                <p className="text-xs text-muted-foreground">Remove "um", "uh", etc.</p>
              </div>
              <Switch
                checked={filterFillerWords}
                onCheckedChange={setFilterFillerWords}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Noise Reduction</Label>
                <p className="text-xs text-muted-foreground">Filter background noise</p>
              </div>
              <Switch
                checked={noiseReduction}
                onCheckedChange={setNoiseReduction}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Processing Video</p>
                  <p className="text-xs text-muted-foreground">{processingStage}</p>
                </div>
              </div>
              {progress > 0 && (
                <Progress value={progress} className="h-2" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcription Result */}
      {transcriptionResult && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Video Transcribed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata */}
            {transcriptionResult.metadata && (
              <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{transcriptionResult.metadata.speakerCount} speakers</span>
                </div>
                <div>
                  Confidence: {(transcriptionResult.metadata.confidence * 100).toFixed(1)}%
                </div>
                <div>
                  Language: {transcriptionResult.metadata.language}
                </div>
              </div>
            )}

            {/* Transcript Preview */}
            <div className="max-h-32 overflow-y-auto p-3 bg-muted/20 rounded-lg border text-xs font-mono">
              {transcriptionResult.transcript.split('\n').slice(0, 10).map((line, index) => (
                <div key={index} className="mb-1">{line}</div>
              ))}
              {transcriptionResult.transcript.split('\n').length > 10 && (
                <div className="text-muted-foreground italic">
                  ... and {transcriptionResult.transcript.split('\n').length - 10} more lines
                </div>
              )}
            </div>

            {/* Import Button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="px-6"
              >
                <Video className="h-4 w-4 mr-2" />
                Import as Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Transcription Button */}
      {selectedFile && !isProcessing && !transcriptionResult && (
        <Button
          onClick={handleTranscribe}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          <Video className="h-4 w-4 mr-2" />
          Transcribe Video with Speaker Detection
        </Button>
      )}

      {/* Help Text */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-sm">Enhanced Features:</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Speaker Detection: Automatically identifies different speakers</p>
          <p>• Smart Formatting: Adds natural paragraph breaks and structure</p>
          <p>• Noise Reduction: Filters out background noise for cleaner transcripts</p>
          <p>• Filler Word Removal: Removes "um", "uh", and other filler words</p>
        </div>
      </div>
    </div>
  );
}
