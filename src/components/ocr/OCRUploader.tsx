
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle, Upload, FileText, Image, FileType, Settings, Copy, AlertTriangle, Bug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRService, OCRResult } from "@/lib/ocrService";
import { OCRFallbackSystem, FallbackResult } from "@/utils/ocrFallbacks";
import { ErrorHandler } from "./ErrorHandler";
import { DebugDashboard } from "./DebugDashboard";

interface OCRUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
  className?: string;
}

export function OCRUploader({ onTextExtracted, className }: OCRUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [fallbackResult, setFallbackResult] = useState<FallbackResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [useEnhancedOCR, setUseEnhancedOCR] = useState(true);
  const [useFallbackSystem, setUseFallbackSystem] = useState(true);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isPDFFile, setIsPDFFile] = useState(false);
  const [currentError, setCurrentError] = useState<any>(null);
  const [showDebugDashboard, setShowDebugDashboard] = useState(false);
  const { toast } = useToast();

  const languages = OCRService.getSupportedLanguages();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setResult(null);
    setFallbackResult(null);
    setExtractedText("");
    setCurrentError(null);
    setIsPDFFile(file.type === 'application/pdf');

    try {
      setProgress(20);
      
      let extractionResult: OCRResult | FallbackResult;
      
      if (useFallbackSystem) {
        // Use enhanced fallback system
        console.log('🔄 Using enhanced fallback system');
        setProgress(30);
        
        extractionResult = await OCRFallbackSystem.extractWithFallbacks(file, selectedLanguage);
        setFallbackResult(extractionResult as FallbackResult);
        
        if (extractionResult.success && extractionResult.text) {
          setExtractedText(extractionResult.text);
          onTextExtracted(extractionResult.text, file.name);
          
          const methodName = (extractionResult as FallbackResult).method;
          const confidence = extractionResult.confidence || 0.8;
          
          toast({
            title: "✅ Text Extracted Successfully!",
            description: `Extracted ${extractionResult.text.length} characters using ${methodName} (${Math.round(confidence * 100)}% confidence)`
          });
        } else {
          throw new Error(extractionResult.error || 'All fallback methods failed');
        }
      } else {
        // Use standard OCR service
        console.log('🔍 Using standard OCR service');
        setProgress(40);
        
        extractionResult = await OCRService.extractTextFromFile(file, selectedLanguage, useEnhancedOCR);
        setResult(extractionResult as OCRResult);
        
        if (extractionResult.success && extractionResult.text) {
          setExtractedText(extractionResult.text);
          onTextExtracted(extractionResult.text, file.name);
          
          toast({
            title: "✅ Text Extracted Successfully!",
            description: `Extracted ${extractionResult.text.length} characters from ${file.name}`
          });
        } else {
          throw new Error((extractionResult as OCRResult).error || 'OCR extraction failed');
        }
      }
      
      setProgress(100);

    } catch (error) {
      console.error('OCR extraction error:', error);
      
      // Create detailed error for error handler
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown OCR error',
        timestamp: new Date(),
        context: `File: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`,
        code: error instanceof Error && error.message.includes('401') ? 401 :
              error instanceof Error && error.message.includes('429') ? 429 :
              error instanceof Error && error.message.includes('network') ? 502 : 500
      };
      
      setCurrentError(errorDetails);
      
      const failedResult: OCRResult = {
        success: false,
        error: errorDetails.message,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      };
      
      setResult(failedResult);
      
      toast({
        title: "❌ OCR Extraction Failed",
        description: errorDetails.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      event.target.value = '';
    }
  };

  const copyRawText = async () => {
    if (extractedText) {
      try {
        await navigator.clipboard.writeText(extractedText);
        toast({
          title: "✅ Raw Text Copied!",
          description: "The extracted text has been copied to your clipboard",
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

  const retryExtraction = () => {
    setCurrentError(null);
    // Trigger file selection again or retry with last file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput?.files?.[0]) {
      handleFileSelect({ target: fileInput } as any);
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
    <div className={className}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* OCR Configuration */}
          <div className="space-y-4">
            {/* Enhanced OCR Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <label className="text-sm font-medium">OCR Configuration</label>
              </div>
              
              <div className="space-y-3">
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
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fallback-system"
                    checked={useFallbackSystem}
                    onCheckedChange={setUseFallbackSystem}
                  />
                  <label htmlFor="fallback-system" className="text-sm">
                    Fallback System (Edge Function → PDF → Tesseract)
                  </label>
                </div>
              </div>
              
              {useFallbackSystem && (
                <p className="text-xs text-muted-foreground">
                  Fallback system tries multiple extraction methods automatically for best results.
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
                    {useFallbackSystem ? 'Processing with fallback system...' : 
                     useEnhancedOCR ? 'Enhanced processing...' : 'Processing...'}
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

          {/* Error Handler */}
          {currentError && (
            <ErrorHandler
              error={currentError}
              onRetry={retryExtraction}
              onClear={() => setCurrentError(null)}
            />
          )}

          {/* Copy Raw Text Button */}
          {((result && result.success) || (fallbackResult && fallbackResult.success)) && extractedText && (
            <Button
              onClick={copyRawText}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Extracted Text
            </Button>
          )}

          {/* Results */}
          {(result || fallbackResult) && (
            <div className={`p-3 rounded-lg border ${
              (result?.success || fallbackResult?.success)
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {(result?.success || fallbackResult?.success) ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span className="text-sm font-medium">
                  {(result?.success || fallbackResult?.success) ? 'Text Extracted Successfully' : 'Extraction Failed'}
                </span>
                
                {/* Method badge for fallback results */}
                {fallbackResult?.method && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {fallbackResult.method}
                  </span>
                )}
                
                {/* Standard method badge */}
                {result?.method && !fallbackResult && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {result.method}
                  </span>
                )}
              </div>
              
              {/* File info and stats */}
              {((result?.success && result.fileInfo) || fallbackResult?.success) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  {result?.fileInfo && getFileIcon(result.fileInfo.name)}
                  <span>{result?.fileInfo?.name || 'File'}</span>
                  <span>•</span>
                  <span>{result?.fileInfo ? (result.fileInfo.size / 1024).toFixed(1) : '0'} KB</span>
                  {extractedText && (
                    <>
                      <span>•</span>
                      <span>{extractedText.length} characters</span>
                    </>
                  )}
                  {((result?.confidence) || fallbackResult?.confidence) && (
                    <>
                      <span>•</span>
                      <span>
                        {result?.confidence || `${Math.round((fallbackResult?.confidence || 0) * 100)}%`} confidence
                      </span>
                    </>
                  )}
                  {fallbackResult?.processingTime && (
                    <>
                      <span>•</span>
                      <span>{fallbackResult.processingTime}ms</span>
                    </>
                  )}
                </div>
              )}

              {/* Fallback methods attempted */}
              {fallbackResult?.fallbacksAttempted && fallbackResult.fallbacksAttempted.length > 1 && (
                <div className="text-xs text-muted-foreground mb-2">
                  <span>Methods tried: {fallbackResult.fallbacksAttempted.join(' → ')}</span>
                </div>
              )}

              {/* Error display */}
              {(result?.error || fallbackResult?.error) && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Error:</strong> {result?.error || fallbackResult?.error}
                    <div className="mt-1 text-muted-foreground">
                      Try switching OCR mode, uploading a clearer image, or using a different file format.
                    </div>
                  </div>
                </div>
              )}

              {/* Text preview */}
              {((result?.success && result.text) || (fallbackResult?.success && fallbackResult.text)) && (
                <div className="mt-2 max-h-32 overflow-y-auto p-2 bg-background/50 rounded text-xs font-mono border">
                  {extractedText.split('\n').slice(0, 5).map((line, index) => (
                    <div key={index} className="mb-1">{line}</div>
                  ))}
                  {extractedText.split('\n').length > 5 && (
                    <div className="text-muted-foreground italic">
                      ... and {extractedText.split('\n').length - 5} more lines
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Debug Dashboard Toggle */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebugDashboard(!showDebugDashboard)}
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDebugDashboard ? 'Hide' : 'Show'} Debug Dashboard
            </Button>
          </div>

          {/* Debug Dashboard */}
          {showDebugDashboard && (
            <DebugDashboard className="mt-4" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
