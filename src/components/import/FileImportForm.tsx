
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Image, Video, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [isProcessing, setIsProcessing] = useState(false);
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

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractTextWithOCR = async (file: File): Promise<string> => {
    try {
      console.log('🔍 Starting OCR extraction for PDF:', file.name);
      
      const base64Data = await convertFileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('pdf-ocr-extraction', {
        body: {
          fileData: base64Data,
          fileName: file.name
        }
      });

      if (error) {
        console.error('OCR function error:', error);
        throw new Error(`OCR extraction failed: ${error.message}`);
      }

      if (!data?.extractedText) {
        throw new Error('No text extracted from document');
      }

      console.log('✅ OCR extraction successful');
      return data.extractedText;

    } catch (error) {
      console.error('❌ OCR extraction error:', error);
      throw error;
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

    setIsProcessing(true);

    try {
      let extractedContent: string;
      const title = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      
      // Check if it's a PDF file
      if (selectedFile.type === 'application/pdf') {
        console.log('📄 PDF detected, using OCR extraction...');
        toast({
          title: "Processing PDF",
          description: "Extracting text using OCR... This may take a moment.",
        });
        
        try {
          extractedContent = await extractTextWithOCR(selectedFile);
          
          toast({
            title: "OCR Successful",
            description: "Text extracted from PDF successfully!",
          });
        } catch (ocrError) {
          console.error('OCR failed, falling back to basic info:', ocrError);
          toast({
            title: "OCR Failed",
            description: "Couldn't extract text from PDF, but file info has been saved.",
            variant: "destructive"
          });
          
          // Fallback to basic file info
          extractedContent = `# ${title}\n\n**File:** ${selectedFile.name}\n**Size:** ${formatFileSize(selectedFile.size)}\n**Type:** PDF Document\n\n**Note:** OCR extraction failed. You can manually add notes about this PDF here.\n\n**Error:** ${ocrError.message}`;
        }
      } else {
        // Handle other file types as before
        extractedContent = await extractTextFromFile(selectedFile);
      }
      
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
    } finally {
      setIsProcessing(false);
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
            disabled={isLoading || isProcessing}
            className="cursor-pointer"
            accept=".txt,.json,.md,.csv,.pdf"
          />
          <p className="text-sm text-gray-500">
            Supported formats: Text files (.txt), JSON (.json), Markdown (.md), CSV (.csv), PDF (.pdf with OCR)
          </p>
        </div>

        {selectedFile && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile)}
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                  {selectedFile.type === 'application/pdf' && (
                    <span className="ml-2 text-blue-600">• OCR Enabled</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleImport}
          disabled={!selectedFile || isLoading || isProcessing}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {selectedFile?.type === 'application/pdf' ? 'Extracting Text...' : 'Importing...'}
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
