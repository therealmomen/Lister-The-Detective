import { cn } from "@/lib/utils";

interface TrustScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function TrustScore({ score, size = "md", className, showLabel = false }: TrustScoreProps) {
  let colorClass = "text-destructive";
  let bgClass = "bg-destructive/10";
  let borderClass = "border-destructive/20";
  let label = "Avoid";

  if (score >= 70) {
    colorClass = "text-success";
    bgClass = "bg-success/10";
    borderClass = "border-success/20";
    label = "Recommended";
  } else if (score >= 40) {
    colorClass = "text-warning";
    bgClass = "bg-warning/10";
    borderClass = "border-warning/20";
    label = "Caution";
  }

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-16 h-16 text-xl",
    lg: "w-24 h-24 text-3xl",
  };

  const ringRadiusClasses = {
    sm: 18,
    md: 28,
    lg: 42,
  };
  
  const strokeWidth = size === "sm" ? 3 : size === "md" ? 4 : 6;
  const radius = ringRadiusClasses[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("relative flex items-center justify-center rounded-full font-mono font-bold", sizeClasses[size], colorClass)}>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}>
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span>{score}</span>
      </div>
      {showLabel && (
        <span className={cn("text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", colorClass, bgClass, borderClass)}>
          {label}
        </span>
      )}
    </div>
  );
}
