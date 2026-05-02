type LogoConfig = {
  src: string;
  bg: string; // background color so the logo is always legible
  fit?: "contain" | "cover";
};

const logos: Record<string, LogoConfig> = {
  amazon:     { src: "/logos/amazon.png",  bg: "#ffffff" },
  ebay:       { src: "/logos/ebay.png",    bg: "#ffffff" },
  noon:       { src: "/logos/noon.png",    bg: "#ffffff" },
  alibaba:    { src: "/logos/alibaba.png", bg: "#ffffff" },
  aliexpress: { src: "/logos/alibaba.png", bg: "#ffffff" },
};

export function PlatformIcon({
  platform,
  className = "",
  size = 20,
}: {
  platform: string;
  className?: string;
  size?: number;
}) {
  const key = Object.keys(logos).find((k) => platform.toLowerCase().includes(k));
  const logo = key ? logos[key] : null;

  if (logo) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded overflow-hidden shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: logo.bg,
          padding: 2,
        }}
      >
        <img
          src={logo.src}
          alt={platform}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          draggable={false}
        />
      </span>
    );
  }

  // Fallback: initial badge
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm font-bold text-[9px] leading-none bg-muted text-muted-foreground shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {platform[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
