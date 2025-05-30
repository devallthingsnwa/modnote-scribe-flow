
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mic, Upload } from 'lucide-react';
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
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      // Placeholder for audio import logic
      const mockContent = {
        title: `Audio File: ${selectedFile.name}`,
        content: 'Audio transcript would be processed here...',
        is_transcription: true
      };
      
      onContentImported(mockContent);
      setSelectedFile(null);
      
      toast({
        title: "Audio Import",
        description: "Audio import functionality coming soon!"
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import audio content",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-blue-500" />
          Import Audio File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleImport}
          disabled={isLoading || !selectedFile}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Import Audio
        </Button>
      </CardContent>
    </Card>
  );
}
