
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileImage, FileText, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadFormProps {
  onContentImported: (content: {
    title: string;
    content: string;
    source_url?: string;
    is_transcription?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function FileUploadForm({ onContentImported, isLoading }: FileUploadFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, image file (JPG, PNG, GIF, WebP), or text file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large", 
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    
    try {
      let content = "";
      
      if (selectedFile.type === 'text/plain') {
        // Handle text files
        content = await selectedFile.text();
      } else if (selectedFile.type === 'application/pdf') {
        // For PDF files, create a placeholder note (OCR would be implemented here)
        content = `This PDF file "${selectedFile.name}" was uploaded but automatic text extraction is not yet available. You can manually add the content below.\n\nFile size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB\nFile type: PDF Document`;
      } else if (selectedFile.type.startsWith('image/')) {
        // For image files, create a placeholder note (OCR would be implemented here)
        content = `This image file "${selectedFile.name}" was uploaded but automatic text extraction is not yet available. You can manually add descriptions or notes about the image below.\n\nFile size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB\nFile type: ${selectedFile.type}`;
      }

      const title = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      
      // Format content with proper structure
      const currentDate = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      let formattedContent = `# 📄 "${title}"\n\n`;
      formattedContent += `**Source:** Local file upload\n`;
      formattedContent += `**Type:** ${selectedFile.type.startsWith('image/') ? 'Image' : selectedFile.type === 'application/pdf' ? 'PDF Document' : 'Text Document'}\n`;
      formattedContent += `**Imported:** ${currentDate}\n`;
      formattedContent += `**File Size:** ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB\n\n`;
      formattedContent += `---\n\n`;
      formattedContent += `## 📝 Content\n\n`;
      formattedContent += `${content}\n\n`;
      formattedContent += `---\n\n`;
      formattedContent += `## 📝 My Notes\n\n`;
      formattedContent += `Add your personal notes and thoughts here...\n`;

      onContentImported({
        title,
        content: formattedContent,
        is_transcription: false
      });

      toast({
        title: "File uploaded successfully!",
        description: `"${selectedFile.name}" has been imported as a new note.`,
      });

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to process the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
        <p className="text-muted-foreground text-sm">
          Upload PDF documents, images, or text files to import as notes
        </p>
      </div>

      {/* File Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports PDF, images (JPG, PNG, GIF, WebP), and text files
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: 10MB
          </p>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Selected File Display */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedFile.type.startsWith('image/') ? (
                  <FileImage className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileText className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      <div className="flex justify-end">
        <Button
          onClick={processFile}
          disabled={!selectedFile || processing || isLoading}
          className="px-6"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import File
            </>
          )}
        </Button>
      </div>

      {/* Supported Formats Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Supported Formats</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            <span>PDF Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <FileImage className="h-4 w-4 text-blue-500" />
            <span>Images (JPG, PNG, GIF)</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-500" />
            <span>Text Files</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Note: PDF and image text extraction will be enhanced in future updates
        </p>
      </div>
    </div>
  );
}
