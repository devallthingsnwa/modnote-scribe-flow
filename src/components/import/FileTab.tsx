
import { Button } from "@/components/ui/button";
import { FileText, Upload, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OCRUploader } from "../ocr/OCRUploader";

interface FileTabProps {
  extractedText: string;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOCRTextExtracted: (text: string, fileName: string) => void;
}

export function FileTab({ extractedText, onFileUpload, onOCRTextExtracted }: FileTabProps) {
  const { toast } = useToast();

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
      {/* Word Documents & Text Files Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-medium text-white">Documents (Word, Text)</h3>
        </div>
        <div className="border-2 border-dashed border-[#333] rounded-lg p-6 text-center hover:border-[#444] transition-colors bg-[#151515]/50 relative">
          <Upload className="mx-auto h-8 w-8 text-gray-500 mb-3" />
          <div className="space-y-2">
            <p className="text-sm text-white">Upload Word or Text documents</p>
            <p className="text-xs text-gray-400">Supports: DOCX, DOC, TXT files</p>
          </div>
          <input
            type="file"
            onChange={onFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".docx,.doc,.txt"
          />
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
          <h3 className="text-sm font-medium text-white">File and Image</h3>
        </div>
        {/* OCR File Upload Component for Photos */}
        <OCRUploader 
          onTextExtracted={onOCRTextExtracted}
          className="bg-[#151515] border-[#333]"
        />
      </div>
    </div>
  );
}
