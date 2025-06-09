
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle, Upload, FileText, Image, FileType, Settings, Copy, AlertTriangle } from "lucide-react";
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
  const [extractedText, setExtractedText] = useState<string>("");
  const [isPDFFile, setIsPDFFile] = useState(false);
  const { toast } = useToast();

  const languages = OCRService.getSupportedLanguages();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setResult(null);
    setExtractedText("");
    setIsPDFFile(file.type === 'application/pdf');

    try {
      // Initial progress updates
      setProgress(20);
      setTimeout(() => setProgress(30), 1000);
      
      const ocrResult = await OCRService.extractTextFromFile(file, selectedLanguage, useEnhancedOCR);
      
      // Update progress based on result
      setProgress(95);

      if (ocrResult.success && ocrResult.text) {
        setResult(ocrResult);
        setExtractedText(ocrResult.text);
        onTextExtracted(ocrResult.text, file.name);
        
        toast({
          title: "✅ Text Extracted Successfully!",
          description: `Extracted ${ocrResult.text.length} characters from ${file.name} using ${ocrResult.method || (useEnhancedOCR ? 'enhanced OCR' : 'basic OCR')}`
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

  const copyRawText = async () => {
    if (extractedText) {
      try {
        await navigator.clipboard.writeText(extractedText);
        toast({
          title: "✅ Raw Text Copied!",
          description: "The extracted text has been copied to your clipboard for formatting",
        });
      } catch (error) {
        toast({
          title: "❌ Copy Failed",
          description: "Failed to copy text to clipboard",
          variant: "destructive"
        });
      }
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
      case 'webp':
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
              Supports: JPG, PNG, GIF, BMP, TIFF, WEBP, PDF (Max 10MB)
            </p>
          </div>
          
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.pdf,image/*,application/pdf"
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
                {isPDFFile ? 'Extracting text from PDF...' : 
                 useEnhancedOCR ? 'Extracting text with enhanced OCR...' : 
                 'Extracting text from image...'}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Copy Raw Text Button - appears after successful extraction */}
        {result && result.success && extractedText && (
          <Button
            onClick={copyRawText}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Extracted Text
          </Button>
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
              {result.method && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {result.method}
                </span>
              )}
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
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Error:</strong> {result.error}
                  <div className="mt-1 text-muted-foreground">
                    Try switching OCR mode, uploading a clearer image, or using a different file format.
                  </div>
                </div>
              </div>
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
      </CardContent>
    </Card>
  );
}
