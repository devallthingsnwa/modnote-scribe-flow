
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Mic } from "lucide-react";
import { YouTubeTab } from "@/components/transcript/YouTubeTab";
import { SpeechToTextTab } from "@/components/transcript/SpeechToTextTab";
import { TranscriptPreview } from "@/components/transcript/TranscriptPreview";
import { InfoCards } from "@/components/transcript/InfoCards";

interface YouTubeTranscriptIntegrationProps {
  onTranscriptExtracted: (content: string) => void;
  className?: string;
}

export function YouTubeTranscriptIntegration({
  onTranscriptExtracted,
  className
}: YouTubeTranscriptIntegrationProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTranscript, setExtractedTranscript] = useState<string>("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [hasWarning, setHasWarning] = useState(false);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Enhanced Transcript Extractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="speech" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Speech-to-Text
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="youtube">
            <YouTubeTab
              onTranscriptExtracted={onTranscriptExtracted}
              isExtracting={isExtracting}
              setIsExtracting={setIsExtracting}
              setExtractedTranscript={setExtractedTranscript}
              setVideoInfo={setVideoInfo}
              setHasWarning={setHasWarning}
            />

            <TranscriptPreview
              extractedTranscript={extractedTranscript}
              videoInfo={videoInfo}
              hasWarning={hasWarning}
            />
          </TabsContent>

          <TabsContent value="speech">
            <SpeechToTextTab onTranscriptExtracted={onTranscriptExtracted} />
          </TabsContent>
        </Tabs>

        <InfoCards />
      </CardContent>
    </Card>
  );
}
