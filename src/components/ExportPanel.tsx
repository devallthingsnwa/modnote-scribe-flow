
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, FileText, Globe, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportPanelProps {
  note: {
    title: string;
    content: string;
    tags: string[];
    source_url?: string;
  };
}

export function ExportPanel({ note }: ExportPanelProps) {
  const [exportFormat, setExportFormat] = useState<'markdown' | 'notion'>('markdown');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateMarkdown = () => {
    const date = new Date().toLocaleDateString();
    let markdown = `# ${note.title}\n\n`;
    
    if (note.source_url) {
      markdown += `**Source:** [${note.source_url}](${note.source_url})\n\n`;
    }
    
    if (note.tags.length > 0) {
      markdown += `**Tags:** ${note.tags.map(tag => `#${tag}`).join(' ')}\n\n`;
    }
    
    markdown += `**Created:** ${date}\n\n`;
    markdown += `---\n\n`;
    markdown += note.content;
    
    return markdown;
  };

  const generateNotionBlocks = () => {
    const blocks = [];
    
    // Title block
    blocks.push({
      object: "block",
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text", text: { content: note.title } }]
      }
    });
    
    // Source URL if available
    if (note.source_url) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: "Source: " } },
            { type: "text", text: { content: note.source_url, link: { url: note.source_url } } }
          ]
        }
      });
    }
    
    // Tags
    if (note.tags.length > 0) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `Tags: ${note.tags.join(', ')}` } }]
        }
      });
    }
    
    // Content
    const contentLines = note.content.split('\n');
    contentLines.forEach(line => {
      if (line.trim()) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: line } }]
          }
        });
      }
    });
    
    return JSON.stringify(blocks, null, 2);
  };

  const getExportContent = () => {
    return exportFormat === 'markdown' ? generateMarkdown() : generateNotionBlocks();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getExportContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: `${exportFormat === 'markdown' ? 'Markdown' : 'Notion blocks'} copied successfully.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const content = getExportContent();
    const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${exportFormat === 'markdown' ? 'md' : 'json'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: `${filename} is being downloaded.`,
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Export Note</h2>
            <p className="text-sm text-muted-foreground">
              Export your notes to Markdown or Notion format
            </p>
          </div>
        </div>
        
        {/* Format Selection */}
        <div className="flex space-x-2">
          <Button
            variant={exportFormat === 'markdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExportFormat('markdown')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Markdown
          </Button>
          <Button
            variant={exportFormat === 'notion' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExportFormat('notion')}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            Notion Blocks
          </Button>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready to Export
          </Badge>
          
          <Badge variant="secondary" className="text-xs">
            {exportFormat === 'markdown' ? 'MD Format' : 'JSON Format'}
          </Badge>
        </div>
      </div>
      
      {/* Export Preview */}
      <Card className="flex-1 flex flex-col border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            Export Preview
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <Textarea
            value={getExportContent()}
            readOnly
            className="flex-1 resize-none font-mono text-xs bg-muted/20 border-border/50"
            placeholder="Export content will appear here..."
          />
        </CardContent>
      </Card>
      
      {/* Export Instructions */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Export Instructions</h3>
          {exportFormat === 'markdown' ? (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Copy the Markdown content above and paste it into any Markdown editor</p>
              <p>• Compatible with GitHub, GitLab, Obsidian, Typora, and more</p>
              <p>• Download as .md file for offline use</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Copy the JSON blocks and import them into Notion using the API</p>
              <p>• Use Notion's block API to create a new page with this content</p>
              <p>• Perfect for structured note organization in Notion databases</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
