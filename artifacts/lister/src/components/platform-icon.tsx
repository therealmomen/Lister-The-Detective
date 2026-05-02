export function PlatformIcon({ platform, className = "" }: { platform: string; className?: string }) {
  const normalizedPlatform = platform.toLowerCase();

  const platforms: Record<string, { color: string; abbr: string }> = {
    amazon:     { color: "#FF9900", abbr: "A" },
    ebay:       { color: "#E53238", abbr: "e" },
    noon:       { color: "#FEEE00", abbr: "N" },
    alibaba:    { color: "#FF6A00", abbr: "阿" },
    aliexpress: { color: "#E43225", abbr: "AE" },
  };

  const match = Object.entries(platforms).find(([key]) =>
    normalizedPlatform.includes(key)
  );

  const { color, abbr } = match ? match[1] : { color: "#888", abbr: platform[0]?.toUpperCase() ?? "?" };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm font-bold text-[9px] leading-none ${className}`}
      style={{ background: color, color: color === "#FEEE00" ? "#000" : "#fff", width: 16, height: 16, flexShrink: 0 }}
    >
      {abbr}
    </span>
  );
}
