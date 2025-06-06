
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Upload, FileText, Image, FileType, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRService, OCRResult } from "@/lib/ocrService";

interface OCRUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
  className?: string;
}

export function OCRUploader({ onTextExtracted, className }: OCRUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const { toast } = useToast();

  const languages = OCRService.getSupportedLanguages();
  const supportedTypes = OCRService.getSupportedFileTypes();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    setIsProcessing(true);
    setProgress(10);
    setResult(null);

    try {
      setProgress(30);
      
      console.log('Starting OCR extraction...');
      const ocrResult = await OCRService.extractTextFromFile(file, selectedLanguage);
      setProgress(90);

      console.log('OCR result:', ocrResult);

      if (ocrResult.success && ocrResult.text) {
        setResult(ocrResult);
        onTextExtracted(ocrResult.text, file.name);
        
        toast({
          title: "✅ Text Extracted Successfully!",
          description: `Extracted ${ocrResult.text.length} characters from ${file.name}`
        });
      } else {
        throw new Error(ocrResult.error || 'Failed to extract text');
      }

      setProgress(100);

    } catch (error) {
      console.error('OCR upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setResult({
        success: false,
        error: errorMessage
      });

      toast({
        title: "❌ OCR Extraction Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileType className="h-5 w-5 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'tiff':
        return <Image className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const resetUploader = () => {
    setResult(null);
    setProgress(0);
    setIsProcessing(false);
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-4 pt-6">
        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Language for OCR</label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full bg-[#1c1c1c] border-[#333] text-white">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1c1c] border-[#333]">
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-[#2a2a2a]">
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload Area */}
        <div className="border-2 border-dashed border-[#333] rounded-lg p-8 text-center hover:border-[#444] transition-colors bg-[#151515]/50 relative">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Upload image or PDF for text extraction</p>
            <p className="text-xs text-gray-400">
              Supports: {supportedTypes.map(t => t.extension.toUpperCase()).join(', ')} (Max 1MB)
            </p>
          </div>
          
          <input
            type="file"
            onChange={handleFileSelect}
            accept={supportedTypes.map(t => `.${t.extension},${t.type}`).join(',')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-[#0f0f0f]/80 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <RefreshCw className="h-6 w-6 mx-auto animate-spin text-blue-400" />
                <p className="text-sm text-white">Extracting text...</p>
              </div>
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              <span>Processing document with OCR...</span>
            </div>
            <Progress value={progress} className="w-full bg-[#2a2a2a]" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-900/20 border-green-500/30' 
              : 'bg-red-900/20 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <span className="text-sm font-medium text-white">
                {result.success ? 'Text Extracted Successfully' : 'Extraction Failed'}
              </span>
              {result.success && (
                <Button
                  onClick={resetUploader}
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-xs text-gray-400 hover:text-white"
                >
                  Upload Another
                </Button>
              )}
            </div>
            
            {result.success && result.fileInfo && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                {getFileIcon(result.fileInfo.name)}
                <span>{result.fileInfo.name}</span>
                <span>•</span>
                <span>{(result.fileInfo.size / 1024).toFixed(1)} KB</span>
                {result.text && (
                  <>
                    <span>•</span>
                    <span className="text-green-400">{result.text.length} characters extracted</span>
                  </>
                )}
              </div>
            )}

            {result.error && (
              <p className="text-sm text-red-400 mb-2">
                {result.error}
              </p>
            )}

            {result.success && result.text && (
              <div className="mt-3 max-h-40 overflow-y-auto p-3 bg-[#1c1c1c] rounded border border-[#333] text-sm font-mono text-gray-300">
                {result.text.split('\n').slice(0, 10).map((line, index) => (
                  <div key={index} className="mb-1">{line || ' '}</div>
                ))}
                {result.text.split('\n').length > 10 && (
                  <div className="text-gray-500 italic mt-2">
                    ... and {result.text.split('\n').length - 10} more lines
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Usage Tips */}
        <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">OCR Tips for Best Results:</p>
              <ul className="space-y-1">
                <li>• Use high-quality, clear images with good contrast</li>
                <li>• Ensure text is horizontal and not rotated</li>
                <li>• PDF files will be processed page by page</li>
                <li>• Select the correct language for optimal accuracy</li>
                <li>• Avoid blurry or low-resolution images</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
