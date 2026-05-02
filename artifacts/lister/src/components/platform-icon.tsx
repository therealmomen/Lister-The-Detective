export function PlatformIcon({ platform, className = "" }: { platform: string; className?: string }) {
  const normalizedPlatform = platform.toLowerCase();

  const platforms: Record<string, { label: string; color: string }> = {
    amazon: { label: "amazon", color: "#FF9900" },
    ebay: { label: "ebay", color: "#E53238" },
    noon: { label: "noon", color: "#FEEE00" },
    alibaba: { label: "alibaba", color: "#FF6A00" },
    aliexpress: { label: "aliexpress", color: "#E43225" },
  };

  const match = Object.entries(platforms).find(([key]) =>
    normalizedPlatform.includes(key)
  );

  if (match) {
    const [, { label, color }] = match;
    return (
      <span
        className={`font-bold text-xs tracking-wide uppercase ${className}`}
        style={{ color }}
      >
        {label}
      </span>
    );
  }

  return (
    <span className={`text-xs uppercase font-bold tracking-wider ${className}`}>
      {platform}
    </span>
  );
}
