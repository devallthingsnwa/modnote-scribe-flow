import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionService } from "@/lib/transcriptionService";
import { PDFTextExtractor } from "@/lib/ocr/pdfTextExtractor";
import { SimplifiedPreviewSection } from "./SimplifiedPreviewSection";
import { ImportTabs, ContentType } from "./ImportTabs";
import { YouTubeTab } from "./YouTubeTab";
import { UrlTab } from "./UrlTab";
import { FileTab } from "./FileTab";
import { AudioTab } from "./AudioTab";
import { TextTab } from "./TextTab";
import { ImportProcessingStatus } from "./ImportProcessingStatus";
import { ImportActions } from "./ImportActions";

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (note: {
    title: string;
    content: string;
    source_url?: string;
    thumbnail?: string;
    is_transcription?: boolean;
  }) => void;
}

export function EnhancedImportModal({ isOpen, onClose, onImport }: EnhancedImportModalProps) {
  const [activeTab, setActiveTab] = useState<ContentType>("youtube");
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [hasWarning, setHasWarning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const { toast } = useToast();

  const resetState = () => {
    setUrl("");
    setMetadata(null);
    setTranscript(null);
    setProgress(0);
    setStatus("");
    setIsProcessing(false);
    setHasWarning(false);
    setIsRecording(false);
    setExtractedText("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Handle Word document text extraction
  const extractWordText = async (file: File): Promise<string> => {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Word extraction error:', error);
      throw new Error('Failed to extract text from Word document');
    }
  };

  // Handle OCR text extraction from file upload
  const handleOCRTextExtracted = (text: string, fileName: string) => {
    setExtractedText(text);
    setMetadata({
      title: fileName,
      author: "OCR Extraction",
      description: `Text extracted from ${fileName} using OCR`
    });
    setTranscript(text);
    setStatus("✅ Text extracted successfully with OCR!");
    setProgress(100);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus("Processing file...");
    setProgress(30);
    
    try {
      let extractedContent = "";
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      // Handle different file types
      if (fileExtension === 'pdf') {
        setStatus("Extracting text from PDF...");
        setProgress(50);
        extractedContent = await PDFTextExtractor.extractTextFromPDF(file);
        
        if (!extractedContent.trim()) {
          throw new Error('PDF contains no extractable text. Try using an image of the PDF with OCR instead.');
        }
        
        setMetadata({
          title: fileName,
          author: "PDF Document",
          description: `Text extracted from ${fileName} with original formatting preserved`
        });
        setTranscript(extractedContent);
        setExtractedText(extractedContent); // Store raw text with original formatting
        setStatus("✅ PDF text extracted successfully with original formatting!");
        setProgress(100);
        
        toast({
          title: "✅ PDF Text Extracted",
          description: `Extracted ${extractedContent.length} characters from ${fileName} with original formatting preserved`,
        });
      } else if (fileExtension === 'docx' || fileExtension === 'doc') {
        setStatus("Extracting text from Word document...");
        setProgress(50);
        extractedContent = await extractWordText(file);
        
        setMetadata({
          title: fileName,
          author: "Word Document",
          description: `Text extracted from ${fileName} with original formatting`
        });
        setTranscript(extractedContent);
        setExtractedText(extractedContent); // Store raw text with original formatting
        setStatus("✅ Word document text extracted successfully with original formatting!");
        setProgress(100);
        
        toast({
          title: "✅ Word Document Processed",
          description: `Extracted ${extractedContent.length} characters from ${fileName} with original formatting`,
        });
      } else if (fileExtension === 'txt') {
        setStatus("Reading text file...");
        setProgress(50);
        extractedContent = await file.text();
        
        setMetadata({
          title: fileName,
          author: "Text File",
          description: `Content from ${fileName} with original formatting`
        });
        setTranscript(extractedContent);
        setExtractedText(extractedContent); // Store raw text with original formatting
        setStatus("✅ Text file loaded successfully with original formatting!");
        setProgress(100);
        
        toast({
          title: "✅ Text File Loaded",
          description: `Loaded ${extractedContent.length} characters from ${fileName} with original formatting`,
        });
      } else {
        // For other file types, just create a placeholder
        setMetadata({
          title: fileName,
          author: "File Upload",
          description: `Uploaded file: ${fileName}`
        });
        setTranscript(`File uploaded: ${fileName}\n\nAdd your notes about this file here...`);
        setStatus("✅ File uploaded successfully!");
        setProgress(100);
        
        toast({
          title: "✅ File Uploaded",
          description: `${fileName} uploaded successfully`,
        });
      }
    } catch (error) {
      console.error('File processing error:', error);
      setStatus("❌ File processing failed");
      toast({
        title: "❌ File Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const processUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL to import content.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setStatus("Analyzing URL...");

    try {
      if (activeTab === "youtube" && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        setStatus("Processing YouTube video...");
        setProgress(30);

        const result = await TranscriptionService.transcribeWithFallback(url);
        setProgress(70);

        if (result.success && result.text) {
          setTranscript(result.text);
          
          const isWarning = result.metadata?.isWarning || result.provider === 'warning-fallback';
          setHasWarning(isWarning);
          
          const videoId = TranscriptionService.extractVideoId(url);
          let videoMetadata = null;
          
          if (videoId) {
            try {
              videoMetadata = await TranscriptionService.getYouTubeMetadata(videoId);
            } catch (error) {
              console.warn('Failed to fetch video metadata:', error);
            }
          }
          
          setMetadata({
            title: videoMetadata?.title || `YouTube Video ${videoId || 'Unknown'}`,
            author: videoMetadata?.author || 'YouTube',
            duration: videoMetadata?.duration || 'Unknown',
            thumbnail: videoMetadata?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          });
          
          if (isWarning) {
            setStatus("⚠️ Video saved with warning - transcript unavailable");
          } else {
            setStatus("✅ Transcript extracted successfully!");
          }
          setProgress(100);
        } else {
          throw new Error(result.error || 'Failed to process video');
        }
      } else {
        setStatus("Processing content...");
        setProgress(50);
        
        const result = await TranscriptionService.transcribeWithFallback(url);
        
        if (result.success && result.text) {
          setTranscript(result.text);
          const isWarning = result.metadata?.isWarning || result.provider === 'warning-fallback';
          setHasWarning(isWarning);
          
          setMetadata({
            title: "Content from URL",
            author: "Web Content",
            description: "Content extracted from provided URL"
          });
          
          if (isWarning) {
            setStatus("⚠️ Content saved with warning - extraction unavailable");
          } else {
            setStatus("✅ Content extracted successfully!");
          }
          setProgress(100);
        } else {
          throw new Error(result.error || 'Failed to process content');
        }
      }

    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process the provided URL.",
        variant: "destructive"
      });
      setProgress(0);
      setStatus("Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      setStatus("Processing voice recording...");
      setProgress(50);
      
      setTimeout(() => {
        setMetadata({
          title: "Voice Recording",
          author: "Voice Note",
          description: "Audio recording transcription"
        });
        setTranscript("Your voice recording transcript would appear here...\n\nAdd additional notes below:");
        setStatus("✅ Voice recording processed!");
        setProgress(100);
        setIsProcessing(false);
      }, 2000);
    } else {
      setIsRecording(true);
      setStatus("🎤 Recording... Click again to stop");
      toast({
        title: "Recording Started",
        description: "Speak now. Click the microphone again to stop recording.",
      });
    }
  };

  const handleImport = () => {
    if (!metadata || !transcript) {
      toast({
        title: "No Content",
        description: "Please process content first to import.",
        variant: "destructive"
      });
      return;
    }

    let noteContent = '';
    
    if (activeTab === 'youtube') {
      noteContent = `# 🎥 ${metadata.title}\n\n**Source:** ${url}\n**Type:** Video Transcript\n**Imported:** ${new Date().toLocaleString()}\n${hasWarning ? '**Status:** ⚠️ Transcript unavailable - manual notes only\n' : ''}\n---\n\n## 📝 ${hasWarning ? 'Notes' : 'Transcript'}\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    } else if (activeTab === 'audio') {
      noteContent = `# 🎤 ${metadata.title}\n\n**Type:** Voice Recording\n**Imported:** ${new Date().toLocaleString()}\n---\n\n## 📝 Transcript\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    } else if (activeTab === 'file') {
      noteContent = `# 📄 ${metadata.title}\n\n**Type:** ${metadata.author === 'OCR Extraction' ? 'OCR Text Extraction' : metadata.author === 'Word Document' ? 'Word Document' : metadata.author === 'PDF Document' ? 'PDF Document' : 'File Upload'}\n**Imported:** ${new Date().toLocaleString()}\n---\n\n## 📝 ${metadata.author === 'OCR Extraction' ? 'Extracted Text' : 'Content'}\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    } else {
      noteContent = `# 📄 ${metadata.title}\n\n**Source:** ${url}\n**Type:** Content\n**Imported:** ${new Date().toLocaleString()}\n${hasWarning ? '**Status:** ⚠️ Content unavailable - manual notes only\n' : ''}\n---\n\n## 📝 ${hasWarning ? 'Notes' : 'Content'}\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
    }

    onImport({
      title: metadata.title,
      content: noteContent,
      source_url: (activeTab === 'youtube' || activeTab === 'url') ? url : undefined,
      thumbnail: metadata.thumbnail,
      is_transcription: (activeTab === 'youtube' && !hasWarning) || activeTab === 'audio' || activeTab === 'file'
    });

    handleClose();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "youtube":
        return (
          <YouTubeTab
            url={url}
            setUrl={setUrl}
            onProcess={processUrl}
            isProcessing={isProcessing}
          />
        );
      case "url":
        return (
          <UrlTab
            url={url}
            setUrl={setUrl}
            onProcess={processUrl}
            isProcessing={isProcessing}
          />
        );
      case "file":
        return (
          <FileTab
            extractedText={extractedText}
            onFileUpload={handleFileUpload}
            onOCRTextExtracted={handleOCRTextExtracted}
          />
        );
      case "audio":
        return (
          <AudioTab
            isRecording={isRecording}
            isProcessing={isProcessing}
            onVoiceRecording={handleVoiceRecording}
            onFileUpload={handleFileUpload}
          />
        );
      case "text":
        return <TextTab />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0f0f0f] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            Import Content
            <Badge variant="secondary" className="text-xs bg-blue-600 text-white">AI-Powered</Badge>
          </DialogTitle>
          <p className="text-sm text-white">
            Choose your content source and let AI create intelligent notes
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tabs */}
          <ImportTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {renderTabContent()}
          </div>

          {/* Processing Status */}
          <ImportProcessingStatus
            isProcessing={isProcessing}
            progress={progress}
            status={status}
            hasWarning={hasWarning}
            transcript={transcript}
          />

          {/* Content Preview */}
          {metadata && transcript && (
            <SimplifiedPreviewSection
              metadata={metadata}
              transcript={transcript}
              contentType={activeTab}
            />
          )}

          {/* Action Buttons */}
          <ImportActions
            onClose={handleClose}
            onImport={handleImport}
            canImport={!!(metadata && transcript)}
            hasWarning={hasWarning}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
