
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Upload, FileText, Image, FileType, RefreshCw, AlertTriangle, Info, TestTube } from "lucide-react";
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
  const [retryCount, setRetryCount] = useState(0);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const languages = OCRService.getSupportedLanguages();
  const supportedTypes = OCRService.getSupportedFileTypes();
  const qualityTips = OCRService.getImageQualityTips();

  const checkServiceStatus = async () => {
    setServiceStatus('unknown');
    const status = await OCRService.testOCRService();
    setServiceStatus(status.available ? 'available' : 'unavailable');
    
    if (!status.available) {
      toast({
        title: "⚠️ OCR Service Status",
        description: `Service appears to be unavailable: ${status.error}`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "✅ OCR Service Status",
        description: "Service is available and responding",
      });
    }
  };

  const processFile = async (file: File) => {
    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    setIsProcessing(true);
    setProgress(10);
    setResult(null);
    setRetryCount(0);
    setCurrentAttempt(0);
    setLastUploadedFile(file);

    try {
      setProgress(20);
      
      console.log('Starting OCR extraction with retry mechanism...');
      
      const ocrResult = await OCRService.extractTextFromFile(file, selectedLanguage, {
        maxRetries: 3,
        retryDelay: 2000,
        onRetry: (attempt, error) => {
          setCurrentAttempt(attempt);
          setRetryCount(attempt);
          setProgress(30 + (attempt * 20));
          
          toast({
            title: `🔄 Retry Attempt ${attempt}`,
            description: `Previous attempt failed: ${error}. Retrying...`,
          });
        }
      });

      setProgress(90);
      console.log('OCR result:', ocrResult);

      if (ocrResult.success && ocrResult.text) {
        setResult(ocrResult);
        onTextExtracted(ocrResult.text, file.name);
        
        const attemptText = ocrResult.retryAttempt && ocrResult.retryAttempt > 1 
          ? ` (succeeded on attempt ${ocrResult.retryAttempt})` 
          : '';
        
        toast({
          title: "✅ Text Extracted Successfully!",
          description: `Extracted ${ocrResult.text.length} characters from ${file.name}${attemptText}`
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
        error: errorMessage,
        retryAttempt: retryCount
      });

      toast({
        title: "❌ OCR Extraction Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setCurrentAttempt(0);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleRetryManually = async () => {
    if (lastUploadedFile) {
      await processFile(lastUploadedFile);
    } else {
      // Create a new file input click to retry with a new file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = supportedTypes.map(t => `.${t.extension},${t.type}`).join(',');
      input.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          await processFile(file);
        }
      });
      input.click();
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

  const resetUploader = () => {
    setResult(null);
    setProgress(0);
    setIsProcessing(false);
    setRetryCount(0);
    setCurrentAttempt(0);
    setLastUploadedFile(null);
  };

  const testWithDifferentFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = supportedTypes.map(t => `.${t.extension},${t.type}`).join(',');
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        await processFile(file);
      }
    });
    input.click();
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-4 pt-6">
        {/* Service Status Check */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">OCR Service Status</label>
            <div className="flex items-center gap-2">
              {serviceStatus === 'available' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Service Available</span>
                </>
              )}
              {serviceStatus === 'unavailable' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Service Unavailable</span>
                </>
              )}
              {serviceStatus === 'unknown' && (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">Status Unknown</span>
                </>
              )}
            </div>
          </div>
          <Button 
            onClick={checkServiceStatus} 
            size="sm" 
            variant="outline"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            Test Service
          </Button>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Language for OCR</label>
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
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors bg-muted/20 relative">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Upload image or PDF for text extraction</p>
            <p className="text-xs text-muted-foreground">
              Supports: {supportedTypes.map(t => t.extension.toUpperCase()).join(', ')} (Max 5MB)
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
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <RefreshCw className="h-6 w-6 mx-auto animate-spin text-primary" />
                <p className="text-sm text-foreground">
                  {currentAttempt > 0 ? `Retry attempt ${currentAttempt}...` : 'Extracting text...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span>
                {currentAttempt > 0 
                  ? `Processing document with OCR... (Retry ${currentAttempt}/3)` 
                  : 'Processing document with OCR...'
                }
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="text-sm font-medium text-foreground">
                {result.success ? 'Text Extracted Successfully' : 'Extraction Failed'}
                {result.retryAttempt && result.retryAttempt > 1 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (After {result.retryAttempt} attempts)
                  </span>
                )}
              </span>
              <div className="ml-auto flex gap-2">
                {!result.success && (
                  <>
                    <Button
                      onClick={handleRetryManually}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Same File
                    </Button>
                    <Button
                      onClick={testWithDifferentFile}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Try Different File
                    </Button>
                  </>
                )}
                {result.success && (
                  <Button
                    onClick={resetUploader}
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Upload Another
                  </Button>
                )}
              </div>
            </div>
            
            {result.success && result.fileInfo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                {getFileIcon(result.fileInfo.name)}
                <span>{result.fileInfo.name}</span>
                <span>•</span>
                <span>{(result.fileInfo.size / 1024).toFixed(1)} KB</span>
                {result.text && (
                  <>
                    <span>•</span>
                    <span className="text-green-500">{result.text.length} characters extracted</span>
                  </>
                )}
              </div>
            )}

            {result.error && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  {result.error}
                </p>
                {result.retryAttempt && result.retryAttempt >= 3 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Troubleshooting suggestions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check if the image is clear and high-quality</li>
                      <li>Ensure the file format is supported (JPG, PNG, PDF, etc.)</li>
                      <li>Verify file size is under 5MB</li>
                      <li>Try a different file to test the service</li>
                      <li>Check service status and wait a few minutes before retrying</li>
                      <li>Ensure good contrast between text and background</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.success && result.text && (
              <div className="mt-3 max-h-40 overflow-y-auto p-3 bg-muted rounded border text-sm font-mono text-muted-foreground">
                {result.text.split('\n').slice(0, 10).map((line, index) => (
                  <div key={index} className="mb-1">{line || ' '}</div>
                ))}
                {result.text.split('\n').length > 10 && (
                  <div className="text-muted-foreground italic mt-2">
                    ... and {result.text.split('\n').length - 10} more lines
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Image Quality Tips */}
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-primary/80">
              <p className="font-medium mb-2">Tips for Best OCR Results:</p>
              <ul className="space-y-1">
                {qualityTips.slice(0, 6).map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
