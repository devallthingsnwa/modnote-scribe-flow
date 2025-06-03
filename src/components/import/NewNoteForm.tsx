
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, FileText } from 'lucide-react';

interface NewNoteFormProps {
  onNoteCreated: (content: {
    title: string;
    content: string;
  }) => void;
}

export function NewNoteForm({ onNoteCreated }: NewNoteFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    onNoteCreated({
      title: title.trim(),
      content: content.trim() || "Start writing your note here..."
    });

    // Reset form
    setTitle('');
    setContent('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-500" />
          Create New Note
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="note-content">Content (optional)</Label>
            <Textarea
              id="note-content"
              placeholder="Start writing your note content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!title.trim()}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
