
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Youtube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface YoutubeImportFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading: boolean;
}

export function YoutubeImportForm({ onContentImported, isLoading }: YoutubeImportFormProps) {
  const [url, setUrl] = useState('');
  const { toast } = useToast();

  const handleImport = async () => {
    if (!url.trim()) return;

    try {
      // Placeholder for YouTube import logic
      const mockContent = {
        title: `YouTube Video: ${url}`,
        content: 'Video transcript would be processed here...',
        source_url: url,
        is_transcription: true
      };
      
      onContentImported(mockContent);
      setUrl('');
      
      toast({
        title: "YouTube Import",
        description: "YouTube import functionality coming soon!"
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import YouTube content",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          Import from YouTube
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleImport}
            disabled={isLoading || !url.trim()}
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
  );
}
