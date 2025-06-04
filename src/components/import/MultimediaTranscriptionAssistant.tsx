
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Mic, FileText } from 'lucide-react';
import { EnhancedYoutubeImportForm } from './EnhancedYoutubeImportForm';

interface MultimediaTranscriptionAssistantProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function MultimediaTranscriptionAssistant({ onContentImported, isLoading }: MultimediaTranscriptionAssistantProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Multimedia Transcription Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="podcast" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Podcast
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audio File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="youtube">
            <EnhancedYoutubeImportForm 
              onContentImported={onContentImported}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="podcast">
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Podcast transcription coming soon...</p>
              <p className="text-sm mt-2">Will support RSS feeds and direct podcast URLs</p>
            </div>
          </TabsContent>
          
          <TabsContent value="audio">
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Audio file upload and transcription coming soon...</p>
              <p className="text-sm mt-2">Will support MP3, WAV, M4A, and other audio formats</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
