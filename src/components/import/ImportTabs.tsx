
import { Video, Mic, FileText, Link, File } from "lucide-react";

export type ContentType = "youtube" | "url" | "file" | "audio" | "text";

interface ImportTabsProps {
  activeTab: ContentType;
  onTabChange: (tab: ContentType) => void;
}

export function ImportTabs({ activeTab, onTabChange }: ImportTabsProps) {
  const tabs = [
    { id: "youtube" as ContentType, label: "YouTube", icon: Video },
    { id: "url" as ContentType, label: "URL", icon: Link },
    { id: "file" as ContentType, label: "File/OCR", icon: File },
    { id: "audio" as ContentType, label: "Audio", icon: Mic },
    { id: "text" as ContentType, label: "Text", icon: FileText },
  ];

  return (
    <div className="flex space-x-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
  );
}
