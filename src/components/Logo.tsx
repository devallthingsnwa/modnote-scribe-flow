
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src="/lovable-uploads/3126b686-ff06-4b16-83b9-87730a7ecad0.png" 
        alt="ModNote" 
        className={cn("object-contain", sizeClasses[size])}
      />
    </div>
  );
}
