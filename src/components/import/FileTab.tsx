
import { Button } from "@/components/ui/button";
import { FileText, Upload, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRUploader } from "../ocr/OCRUploader";
import { useState } from "react";

interface FileTabProps {
  extractedText: string;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOCRTextExtracted: (text: string, fileName: string) => void;
}

export function FileTab({ extractedText, onFileUpload, onOCRTextExtracted }: FileTabProps) {
  const { toast } = useToast();
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingDocument(true);
    
    try {
      // Handle different document types
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Use PDF.js for PDF extraction
        const { PDFTextExtractor } = await import('../../lib/ocr/pdfTextExtractor');
        const text = await PDFTextExtractor.extractTextFromPDF(file);
        
        if (text.trim()) {
          onOCRTextExtracted(text, file.name);
          toast({
            title: "✅ PDF Text Extracted",
            description: `Extracted ${text.length} characters from ${file.name}`,
          });
        } else {
          toast({
            title: "⚠️ No Text Found",
            description: "This PDF appears to be image-based or has no extractable text",
            variant: "destructive"
          });
        }
      } else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        // Handle Word documents
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        onOCRTextExtracted(result.value, file.name);
        toast({
          title: "✅ Word Document Processed",
          description: `Extracted ${result.value.length} characters from ${file.name}`,
        });
      } else if (file.name.toLowerCase().endsWith('.txt')) {
        // Handle text files
        const text = await file.text();
        onOCRTextExtracted(text, file.name);
        toast({
          title: "✅ Text File Loaded",
          description: `Loaded ${text.length} characters from ${file.name}`,
        });
      }
    } catch (error) {
      console.error('Document processing error:', error);
      toast({
        title: "❌ Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process document",
        variant: "destructive"
      });
    } finally {
      setIsProcessingDocument(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const copyToClipboard = async () => {
    if (extractedText) {
      try {
        await navigator.clipboard.writeText(extractedText);
        toast({
          title: "✅ Copied to Clipboard",
          description: "Text has been copied to your clipboard for editing",
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

  return (
    <div className="space-y-6">
      {/* Documents Section (PDF, Word, Text) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-medium text-white">Documents (PDF, Word, Text)</h3>
        </div>
        <div className="border-2 border-dashed border-[#333] rounded-lg p-6 text-center hover:border-[#444] transition-colors bg-[#151515]/50 relative">
          <Upload className="mx-auto h-8 w-8 text-gray-500 mb-3" />
          <div className="space-y-2">
            <p className="text-sm text-white">Upload documents for text extraction</p>
            <p className="text-xs text-gray-400">Supports: PDF, DOCX, DOC, TXT files</p>
          </div>
          <input
            type="file"
            onChange={handleDocumentUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.docx,.doc,.txt"
            disabled={isProcessingDocument}
          />
          {isProcessingDocument && (
            <div className="absolute inset-0 bg-[#151515]/80 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-xs text-white">Processing document...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Copy to Clipboard Button */}
        {extractedText && (
          <Button
            onClick={copyToClipboard}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Text to Clipboard (Edit in Word/Editor)
          </Button>
        )}
      </div>

      <div className="border-t border-[#333] pt-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-green-400" />
          <h3 className="text-sm font-medium text-white">Images (OCR)</h3>
        </div>
        {/* OCR for Images Only */}
        <OCRUploader 
          onTextExtracted={onOCRTextExtracted}
          className="bg-[#151515] border-[#333]"
        />
      </div>
    </div>
  );
}
