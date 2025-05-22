
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className={cn("font-semibold", sizeClasses[size], className)}>
      <span className="text-modnote-purple">Mod</span>
      <span className="text-foreground">Note</span>
    </div>
  );
}
