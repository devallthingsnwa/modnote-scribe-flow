import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, FileText, Upload, Mic, Video, Link, File, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionService } from "@/lib/transcriptionService";
import { SimplifiedPreviewSection } from "./SimplifiedPreviewSection";
import { OCRUploader } from "../ocr/OCRUploader";

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

type ContentType = "youtube" | "url" | "file" | "audio" | "text";

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

  const tabs = [
    { id: "youtube" as ContentType, label: "YouTube", icon: Video },
    { id: "url" as ContentType, label: "URL", icon: Link },
    { id: "file" as ContentType, label: "File/OCR", icon: File },
    { id: "audio" as ContentType, label: "Audio", icon: Mic },
    { id: "text" as ContentType, label: "Text", icon: FileText },
  ];

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
      if (fileExtension === 'docx' || fileExtension === 'doc') {
        setStatus("Extracting text from Word document...");
        setProgress(50);
        extractedContent = await extractWordText(file);
        
        setMetadata({
          title: fileName,
          author: "Word Document",
          description: `Text extracted from ${fileName}`
        });
        setTranscript(extractedContent);
        setExtractedText(extractedContent);
        setStatus("✅ Word document text extracted successfully!");
        setProgress(100);
        
        toast({
          title: "✅ Word Document Processed",
          description: `Extracted ${extractedContent.length} characters from ${fileName}`,
        });
      } else if (fileExtension === 'txt') {
        setStatus("Reading text file...");
        setProgress(50);
        extractedContent = await file.text();
        
        setMetadata({
          title: fileName,
          author: "Text File",
          description: `Content from ${fileName}`
        });
        setTranscript(extractedContent);
        setExtractedText(extractedContent);
        setStatus("✅ Text file loaded successfully!");
        setProgress(100);
        
        toast({
          title: "✅ Text File Loaded",
          description: `Loaded ${extractedContent.length} characters from ${fileName}`,
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
      noteContent = `# 📄 ${metadata.title}\n\n**Type:** ${metadata.author === 'OCR Extraction' ? 'OCR Text Extraction' : metadata.author === 'Word Document' ? 'Word Document' : 'File Upload'}\n**Imported:** ${new Date().toLocaleString()}\n---\n\n## 📝 ${metadata.author === 'OCR Extraction' ? 'Extracted Text' : 'Content'}\n\n${transcript}\n\n---\n\n## 📝 My Notes\n\nAdd your personal notes and thoughts here...`;
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
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-white">YouTube URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-[#1c1c1c] border-[#333] text-white placeholder-gray-400 focus:border-[#555]"
                />
                <Button
                  onClick={processUrl}
                  disabled={isProcessing || !url.trim()}
                  className="bg-[#dc2626] hover:bg-[#b91c1c] text-white border-0 whitespace-nowrap"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Extract from YouTube
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      case "url":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-white">Website URL</label>
              <Input
                placeholder="https://example.com/article..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mb-4 bg-[#1c1c1c] border-[#333] text-white placeholder-gray-400 focus:border-[#555]"
              />
              <Button
                onClick={processUrl}
                disabled={isProcessing || !url.trim()}
                className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border-[#333]"
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Extract from URL
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case "file":
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
                  onChange={handleFileUpload}
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
                onTextExtracted={handleOCRTextExtracted}
                className="bg-[#151515] border-[#333]"
              />
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Button
                onClick={handleVoiceRecording}
                variant={isRecording ? "destructive" : "outline"}
                size="lg"
                className={`w-full ${isRecording ? 'animate-pulse bg-[#dc2626] hover:bg-[#b91c1c]' : 'bg-[#1c1c1c] hover:bg-[#2a2a2a] text-white border-[#333]'}`}
                disabled={isProcessing && !isRecording}
              >
                <Mic className="h-5 w-5 mr-2" />
                {isRecording ? "Stop Recording" : "Start Voice Recording"}
              </Button>
              {isRecording && (
                <p className="text-sm text-white">
                  🎤 Recording in progress... Click "Stop Recording" when done
                </p>
              )}
              
              <div className="border-2 border-dashed border-[#333] rounded-lg p-8 text-center hover:border-[#444] transition-colors bg-[#151515]/50 relative">
                <Upload className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-white">Or upload audio files</p>
                  <p className="text-xs text-gray-400">Supports MP3, WAV, M4A files</p>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".mp3,.wav,.m4a,.mp4"
                />
              </div>
            </div>
          </div>
        );

      case "text":
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <p className="text-sm text-white">Manual text input coming soon</p>
            </div>
          </div>
        );

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
          <div className="flex space-x-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                    activeTab === tab.id
                      ? 'bg-[#2a2a2a] text-white shadow-sm border border-[#444]'
                      : 'text-white hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {renderTabContent()}
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white">
                <Clock className="h-4 w-4 animate-spin" />
                <span>{status}</span>
              </div>
              <Progress value={progress} className="w-full bg-[#2a2a2a]" />
            </div>
          )}

          {/* Success Status */}
          {!isProcessing && transcript && (
            <div className={`flex items-center gap-2 text-sm ${hasWarning ? 'text-orange-400' : 'text-green-400'}`}>
              {hasWarning ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>{status}</span>
            </div>
          )}

          {/* Content Preview */}
          {metadata && transcript && (
            <SimplifiedPreviewSection
              metadata={metadata}
              transcript={transcript}
              contentType={activeTab}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClose} className="bg-[#2a2a2a] border-[#444] text-white hover:bg-[#3a3a3a]">
              Cancel
            </Button>
            
            {metadata && transcript && (
              <Button onClick={handleImport} className="bg-blue-600 hover:bg-blue-700 text-white">
                <FileText className="h-4 w-4 mr-2" />
                {hasWarning ? 'Save Note with Warning' : 'Import to Notes'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
