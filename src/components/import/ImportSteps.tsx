
import { ArrowRight } from "lucide-react";

interface ImportStepProps {
  currentStep: string;
  step: string;
  icon: React.ReactNode;
  label: string;
}

function ImportStep({ currentStep, step, icon, label }: ImportStepProps) {
  const getStepClasses = () => {
    const active = step === currentStep;
    const completed = 
      (step === "url" && (currentStep === "preview" || currentStep === "processing" || currentStep === "complete")) || 
      (step === "preview" && (currentStep === "processing" || currentStep === "complete")) || 
      (step === "processing" && currentStep === "complete");
      
    const baseClasses = "h-8 w-8 p-1 rounded-full flex items-center justify-center";
    const activeClasses = "bg-primary text-primary-foreground";
    const completedClasses = "bg-green-500 text-white";
    const inactiveClasses = "bg-muted text-muted-foreground";
    
    return `${baseClasses} ${completed ? completedClasses : active ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className={getStepClasses()}>
        {icon}
      </div>
      <span className="text-xs mt-1">{label}</span>
    </div>
  );
}

export function ImportSteps({ currentStep }: { currentStep: string }) {
  return (
    <div className="flex justify-between items-center py-4 px-2">
      <ImportStep 
        currentStep={currentStep}
        step="url"
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path></svg>}
        label="URL"
      />
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <ImportStep 
        currentStep={currentStep}
        step="preview"
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect width="15" height="14" x="1" y="5" rx="2" ry="2"></rect></svg>}
        label="Transcript"
      />
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <ImportStep 
        currentStep={currentStep}
        step="processing"
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" x2="8" y1="13" y2="13"></line><line x1="16" x2="8" y1="17" y2="17"></line><line x1="10" x2="8" y1="9" y2="9"></line></svg>}
        label="Import"
      />
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <ImportStep 
        currentStep={currentStep}
        step="complete"
        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20 6 9 17l-5-5"></path></svg>}
        label="Complete"
      />
    </div>
  );
}
