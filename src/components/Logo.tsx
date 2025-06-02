
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
        src="/lovable-uploads/16e636a2-65fe-45ab-bfb0-be6ddd3797d0.png" 
        alt="ModNote" 
        className={cn("object-contain", sizeClasses[size])}
      />
    </div>
  );
}
