import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { OCRService } from "@/lib/ocrService";
import { ErrorHandler } from "./ErrorHandler";
import { Loader2, File, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { OneClickSetup } from "./OneClickSetup";
import { SetupDashboard } from "./SetupDashboard";

interface OCRUploaderProps {
  onTextExtracted?: (text: string) => void;
  className?: string;
}

export function OCRUploader({ onTextExtracted, className }: OCRUploaderProps) {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<{ code?: number; message: string; timestamp: Date } | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const [useEnhancedOCR, setUseEnhancedOCR] = useState(true);
  const { toast } = useToast();

  const [showSetup, setShowSetup] = useState(false);
  const [systemReady, setSystemReady] = useState(false);

  const validateFile = (file: File): string | null => {
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/bmp', 'image/tiff', 'image/webp', 'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, BMP, TIFF, WEBP, PDF`;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setExtractedText(null);
    setFileInfo({ name: file.name, size: file.size, type: file.type });

    const validationError = validateFile(file);
    if (validationError) {
      setError({ message: validationError, timestamp: new Date() });
      return;
    }

    setProcessing(true);
    try {
      const ocrResult = await OCRService.extractTextFromFile(file, selectedLanguage, useEnhancedOCR);

      if (ocrResult.success && ocrResult.text) {
        setExtractedText(ocrResult.text);
        onTextExtracted?.(ocrResult.text);
        toast({
          title: "✅ OCR Successful",
          description: `Extracted text from ${file.name}`,
        });
      } else {
        setError({ message: ocrResult.error || 'OCR extraction failed', timestamp: new Date() });
        toast({
          title: "❌ OCR Failed",
          description: ocrResult.error || 'Failed to extract text from the image.',
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('OCR failed:', err);
      setError({ message: err.message || 'An unexpected error occurred', timestamp: new Date() });
      toast({
        title: "❌ OCR Error",
        description: err.message || 'An unexpected error occurred during OCR.',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      await handleFileSelect(acceptedFiles[0]);
    }
  }, [handleFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleSetupComplete = () => {
    setSystemReady(true);
    setShowSetup(false);
    toast({
      title: "🎉 OCR Ready!",
      description: "You can now upload files for text extraction.",
    });
  };

  const handleRetry = () => {
    if (fileInfo) {
      // For retry, we'll just trigger the file input again since we can't recreate the original file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      } else {
        toast({
          title: "Retry Required",
          description: "Please upload the file again to retry OCR extraction.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* One-Click Setup Section */}
      {!systemReady && !showSetup && (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
          <OneClickSetup 
            onSetupComplete={handleSetupComplete}
            className="max-w-2xl mx-auto"
          />
          
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowSetup(true)}
              className="text-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced Setup Options
            </Button>
          </div>
        </div>
      )}

      {/* Advanced Setup Dashboard */}
      {showSetup && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Advanced OCR Setup</h3>
            <Button
              variant="outline"
              onClick={() => setShowSetup(false)}
              size="sm"
            >
              Hide Setup
            </Button>
          </div>
          <SetupDashboard />
        </div>
      )}

      {/* Main OCR Interface (existing code) */}
      {(systemReady || showSetup) && (
        <>
          {/* Language Selection */}
          <div className="flex items-center gap-4">
            <Label htmlFor="language" className="text-sm font-medium">
              Language:
            </Label>
            <Select onValueChange={setSelectedLanguage} defaultValue={selectedLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {OCRService.getSupportedLanguages().map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch id="enhanced" checked={useEnhancedOCR} onCheckedChange={setUseEnhancedOCR} />
              <Label htmlFor="enhanced" className="text-sm font-medium">
                Enhanced OCR
              </Label>
            </div>
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center space-y-3">
              <File className="h-6 w-6 text-gray-500" />
              <p className="text-sm text-gray-500">
                {isDragActive
                  ? "Drop the file here..."
                  : "Click here or drag and drop a file to upload"}
              </p>
              {fileInfo && (
                <p className="text-xs text-gray-400">
                  {fileInfo.name} ({Math.ceil(fileInfo.size / 1024)} KB)
                </p>
              )}
              {processing && (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </div>
              )}
            </div>
          </div>

          {/* Results Display */}
          {extractedText && (
            <Card>
              <CardContent>
                <Textarea
                  value={extractedText}
                  readOnly
                  className="min-h-[200px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <ErrorHandler 
              error={error} 
              onRetry={handleRetry}
            />
          )}
        </>
      )}
    </div>
  );
}
