
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Upload, FileText, Image, FileType, Settings, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRService, EnhancedOCROptions } from "@/lib/ocrService";

interface OCRUploaderProps {
  onTextExtracted: (text: string, fileName: string) => void;
  className?: string;
}

export function OCRUploader({ onTextExtracted, className }: OCRUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [ocrOptions, setOCROptions] = useState<EnhancedOCROptions>({
    useMultipleEngines: true,
    preprocessing: {
      denoise: true,
      binarize: true,
      deskew: true,
      enhance: true
    },
    postprocessing: {
      removeExtraSpaces: true,
      fixLineBreaks: true,
      preserveStructure: true
    }
  });
  const { toast } = useToast();

  const languages = OCRService.getSupportedLanguages();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file first
    const validation = await OCRService.validateFile(file);
    if (!validation.valid) {
      toast({
        title: "❌ Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      
      if (validation.suggestions) {
        console.log('Suggestions:', validation.suggestions);
      }
      
      event.target.value = '';
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setResult(null);

    try {
      setProgress(30);
      
      const enhancedOptions: EnhancedOCROptions = {
        language: selectedLanguage,
        ...ocrOptions
      };

      console.log('Starting enhanced OCR with options:', enhancedOptions);
      
      const ocrResult = await OCRService.extractTextFromFile(file, enhancedOptions);
      setProgress(90);

      if (ocrResult.success && ocrResult.text) {
        setResult(ocrResult);
        onTextExtracted(ocrResult.text, file.name);
        
        const processingTime = ocrResult.processingTime ? `${ocrResult.processingTime.toFixed(0)}ms` : 'Unknown';
        const confidence = ocrResult.confidence ? `${(ocrResult.confidence * 100).toFixed(1)}%` : 'Unknown';
        
        toast({
          title: "✅ Text Extracted Successfully!",
          description: `${ocrResult.text.length} characters extracted in ${processingTime} (Confidence: ${confidence})`
        });
      } else {
        throw new Error(ocrResult.error || 'Failed to extract text');
      }

      setProgress(100);

    } catch (error) {
      console.error('Enhanced OCR upload error:', error);
      
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

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence > 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence > 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-4 pt-6">
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

        {/* Advanced Options Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="advanced-mode"
            checked={advancedMode}
            onCheckedChange={setAdvancedMode}
          />
          <Label htmlFor="advanced-mode" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced OCR Options
          </Label>
        </div>

        {/* Advanced Options Panel */}
        {advancedMode && (
          <Card className="bg-muted/50">
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Multi-Engine OCR */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="multi-engine"
                    checked={ocrOptions.useMultipleEngines}
                    onCheckedChange={(checked) => 
                      setOCROptions(prev => ({ ...prev, useMultipleEngines: checked }))
                    }
                  />
                  <Label htmlFor="multi-engine" className="text-sm">
                    <Zap className="h-3 w-3 inline mr-1" />
                    Multiple Engines
                  </Label>
                </div>

                {/* Image Enhancement */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enhance"
                    checked={ocrOptions.preprocessing?.enhance}
                    onCheckedChange={(checked) => 
                      setOCROptions(prev => ({ 
                        ...prev, 
                        preprocessing: { ...prev.preprocessing, enhance: checked }
                      }))
                    }
                  />
                  <Label htmlFor="enhance" className="text-sm">
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Image Enhancement
                  </Label>
                </div>

                {/* Denoising */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="denoise"
                    checked={ocrOptions.preprocessing?.denoise}
                    onCheckedChange={(checked) => 
                      setOCROptions(prev => ({ 
                        ...prev, 
                        preprocessing: { ...prev.preprocessing, denoise: checked }
                      }))
                    }
                  />
                  <Label htmlFor="denoise" className="text-sm">Denoising</Label>
                </div>

                {/* Binarization */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="binarize"
                    checked={ocrOptions.preprocessing?.binarize}
                    onCheckedChange={(checked) => 
                      setOCROptions(prev => ({ 
                        ...prev, 
                        preprocessing: { ...prev.preprocessing, binarize: checked }
                      }))
                    }
                  />
                  <Label htmlFor="binarize" className="text-sm">Binarization</Label>
                </div>

                {/* Deskewing */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="deskew"
                    checked={ocrOptions.preprocessing?.deskew}
                    onCheckedChange={(checked) => 
                      setOCROptions(prev => ({ 
                        ...prev, 
                        preprocessing: { ...prev.preprocessing, deskew: checked }
                      }))
                    }
                  />
                  <Label htmlFor="deskew" className="text-sm">Deskewing</Label>
                </div>

                {/* Text Cleanup */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cleanup"
                    checked={ocrOptions.postprocessing?.removeExtraSpaces}
                    onCheckedChange={(checked) => 
                      setOCROptions(prev => ({ 
                        ...prev, 
                        postprocessing: { ...prev.postprocessing, removeExtraSpaces: checked }
                      }))
                    }
                  />
                  <Label htmlFor="cleanup" className="text-sm">Text Cleanup</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors relative">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload image or PDF for enhanced text extraction</p>
            <p className="text-xs text-muted-foreground">
              Supports: JPG, PNG, GIF, BMP, TIFF, PDF (Max 5MB)
            </p>
            {advancedMode && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                🚀 Advanced OCR with preprocessing & multi-engine support enabled
              </p>
            )}
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
                <p className="text-xs text-muted-foreground">Processing with enhanced OCR...</p>
              </div>
            </div>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Enhanced OCR extraction in progress...</span>
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
                {result.success ? 'Enhanced OCR Successful' : 'Extraction Failed'}
              </span>
            </div>
            
            {result.success && result.fileInfo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getFileIcon(result.fileInfo.name)}
                  <span>{result.fileInfo.name}</span>
                  <span>•</span>
                  <span>{(result.fileInfo.size / 1024).toFixed(1)} KB</span>
                  {result.text && (
                    <>
                      <span>•</span>
                      <span>{result.text.length} chars</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                  {result.engine && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Engine: {result.engine}
                    </span>
                  )}
                  {result.confidence && (
                    <span className={`flex items-center gap-1 ${getConfidenceColor(result.confidence)}`}>
                      Quality: {(result.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                  {result.processingTime && (
                    <span className="flex items-center gap-1">
                      ⏱️ {result.processingTime.toFixed(0)}ms
                    </span>
                  )}
                </div>

                {result.structure && (
                  <div className="text-xs text-muted-foreground">
                    📊 {result.structure.paragraphs.length} paragraphs, {result.structure.sentences.length} sentences, {result.structure.wordCount} words
                  </div>
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
                {result.text.split('\n').slice(0, 5).map((line: string, index: number) => (
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

        {/* Enhanced Tips */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Enhanced OCR Features:</p>
              <ul className="space-y-1">
                <li>• Multiple OCR engines for maximum accuracy</li>
                <li>• Automatic image preprocessing (denoising, contrast enhancement)</li>
                <li>• Intelligent text cleanup and structure preservation</li>
                <li>• PDF text extraction with fallback OCR processing</li>
                <li>• Support for 25+ languages with optimized recognition</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
