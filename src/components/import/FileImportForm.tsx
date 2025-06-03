
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Image, Video, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileImportFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    is_transcription?: boolean;
  }) => void;
  isLoading: boolean;
}

export function FileImportForm({ onContentImported, isLoading }: FileImportFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4 text-purple-500" />;
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        if (file.type === 'text/plain') {
          resolve(result);
        } else if (file.type === 'application/json') {
          try {
            const parsed = JSON.parse(result);
            resolve(JSON.stringify(parsed, null, 2));
          } catch (error) {
            reject(new Error('Invalid JSON file'));
          }
        } else {
          // For other file types, return basic info
          resolve(`File: ${file.name}\nSize: ${formatFileSize(file.size)}\nType: ${file.type}\n\nContent extraction not supported for this file type. You can add your notes about this file here.`);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to import",
        variant: "destructive"
      });
      return;
    }

    try {
      const extractedContent = await extractTextFromFile(selectedFile);
      const title = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      
      onContentImported({
        title,
        content: extractedContent,
        is_transcription: false
      });

      // Reset form
      setSelectedFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('File import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import file content",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-purple-500" />
          Import from File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
            className="cursor-pointer"
            accept=".txt,.json,.md,.csv"
          />
          <p className="text-sm text-gray-500">
            Supported formats: Text files (.txt), JSON (.json), Markdown (.md), CSV (.csv)
          </p>
        </div>

        {selectedFile && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile)}
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleImport}
          disabled={!selectedFile || isLoading}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import File
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
