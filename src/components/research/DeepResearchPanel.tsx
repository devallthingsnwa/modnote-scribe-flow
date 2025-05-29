
import { useState } from "react";
import { Search, Brain, Filter, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DeepResearchWidget } from "@/components/DeepResearchWidget";

export function DeepResearchPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="h-full flex flex-col border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Deep Research
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-powered search across all your notes, transcripts, and data
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-4 h-full">
          {/* Enhanced Deep Research Widget */}
          <DeepResearchWidget />
          
          <Separator />
          
          {/* Future Filter Options */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4" />
              Quick Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                By Notebook
              </Button>
              <Button variant="outline" size="sm" disabled className="text-xs">
                By Tag
              </Button>
              <Button variant="outline" size="sm" disabled className="text-xs">
                By Date
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Advanced filters coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
