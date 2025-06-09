
import { SetupDashboard } from "@/components/ocr/SetupDashboard";

export default function OCRSetup() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">OCR System Setup</h1>
          <p className="text-muted-foreground mt-2">
            Configure and test your OCR text extraction system with automated setup tools.
          </p>
        </div>
        
        <SetupDashboard />
      </div>
    </div>
  );
}
