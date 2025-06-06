import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle, Upload, FileText, Image, FileType, Settings } from "lucide-react";
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
  const [useEnhancedOCR, setUseEnhancedOCR] = useState(true);
  const { toast } = useToast();

  const languages = OCRService.getSupportedLanguages();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setResult(null);

    try {
      setProgress(30);
      
      const ocrResult = await OCRService.extractTextFromFile(file, selectedLanguage, useEnhancedOCR);
      setProgress(90);

      if (ocrResult.success && ocrResult.text) {
        setResult(ocrResult);
        onTextExtracted(ocrResult.text, file.name);
        
        toast({
          title: "✅ Text Extracted Successfully!",
          description: `Extracted ${ocrResult.text.length} characters from ${file.name}${useEnhancedOCR ? ' (Enhanced OCR)' : ''}`
        });
      } else {
        throw new Error(ocrResult.error || 'Failed to extract text');
      }

      setProgress(100);

    } catch (error) {
      console.error('OCR upload error:', error);
      
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "❌ OCR Extraction Failed",
        description: error instanceof Error ? error.message : 'Failed to extract text from file',
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

  return (
    <Card className={className}>
      <CardContent className="space-y-4 pt-6">
        {/* Enhanced OCR Toggle */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <label className="text-sm font-medium">OCR Mode</label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="enhanced-ocr"
              checked={useEnhancedOCR}
              onCheckedChange={setUseEnhancedOCR}
            />
            <label htmlFor="enhanced-ocr" className="text-sm">
              Enhanced OCR {useEnhancedOCR ? '(Multiple engines, preprocessing)' : '(Basic OCR)'}
            </label>
          </div>
          {useEnhancedOCR && (
            <p className="text-xs text-muted-foreground">
              Enhanced mode includes image preprocessing, multiple OCR engines, and text cleanup for better accuracy.
            </p>
          )}
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors relative">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload image or PDF for text extraction</p>
            <p className="text-xs text-muted-foreground">
              Supports: JPG, PNG, GIF, BMP, TIFF, PDF (Max 10MB)
            </p>
          </div>
          
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.pdf,image/*,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">
                  {useEnhancedOCR ? 'Enhanced processing...' : 'Processing...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>
                {useEnhancedOCR ? 'Extracting text with enhanced OCR...' : 'Extracting text from image...'}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`p-3 rounded-lg border ${
            result.success 
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm font-medium">
                {result.success ? 'Text Extracted Successfully' : 'Extraction Failed'}
              </span>
            </div>
            
            {result.success && result.fileInfo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                {getFileIcon(result.fileInfo.name)}
                <span>{result.fileInfo.name}</span>
                <span>•</span>
                <span>{(result.fileInfo.size / 1024).toFixed(1)} KB</span>
                {result.text && (
                  <>
                    <span>•</span>
                    <span>{result.text.length} characters</span>
                  </>
                )}
                {result.confidence && (
                  <>
                    <span>•</span>
                    <span>{result.confidence} confidence</span>
                  </>
                )}
              </div>
            )}

            {result.error && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {result.error}
              </p>
            )}

            {result.success && result.text && (
              <div className="mt-2 max-h-32 overflow-y-auto p-2 bg-background/50 rounded text-xs font-mono border">
                {result.text.split('\n').slice(0, 5).map((line, index) => (
                  <div key={index} className="mb-1">{line}</div>
                ))}
                {result.text.split('\n').length > 5 && (
                  <div className="text-muted-foreground italic">
                    ... and {result.text.split('\n').length - 5} more lines
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced OCR Tips */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Enhanced OCR Tips:</p>
              <ul className="space-y-1">
                <li>• Use high-quality, clear images for better accuracy</li>
                <li>• Ensure text is horizontal and not rotated</li>
                <li>• PDF files will be processed for direct text extraction first</li>
                <li>• Select the correct language for optimal results</li>
                <li>• Enhanced mode applies automatic image preprocessing</li>
                <li>• Multiple OCR engines are used for better reliability</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
