import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 gap-4">
          {/* Brand — stacked on mobile, single line on desktop */}
          <Link href="/" className="shrink-0 flex items-center">
            {/* Mobile: two-line stacked */}
            <span className="sm:hidden font-black tracking-tight text-sm leading-[1.1]">
              <span className="block">LISTER THE</span>
              <span className="block">DETECTIVE</span>
            </span>
            {/* Desktop: single line */}
            <span className="hidden sm:block font-black tracking-tight text-base leading-none whitespace-nowrap">
              LISTER THE DETECTIVE
            </span>
          </Link>

          {/* Nav — pushed to the right with auto margin, separated from toggle */}
          <nav className="flex items-center gap-5 text-sm font-medium ml-auto">
            <Link
              href="/"
              className={cn(
                "transition-colors hover:text-foreground/80 whitespace-nowrap",
                location === "/" ? "text-foreground" : "text-foreground/60"
              )}
            >
              Analyze
            </Link>
            <Link
              href="/history"
              className={cn(
                "transition-colors hover:text-foreground/80 whitespace-nowrap",
                location === "/history" ? "text-foreground" : "text-foreground/60"
              )}
            >
              History
            </Link>
            <Link
              href="/about"
              className={cn(
                "transition-colors hover:text-foreground/80 whitespace-nowrap",
                location === "/about" ? "text-foreground" : "text-foreground/60"
              )}
            >
              About
            </Link>
          </nav>

          {/* Theme toggle — always at the far right with clear separation */}
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle theme"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-border/50 bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
