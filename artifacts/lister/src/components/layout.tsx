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
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          <div className="flex flex-1 items-center">
            <Link href="/" className="mr-8 flex items-center">
              <span className="font-black tracking-tight text-lg leading-none">
                LISTER{" "}
                <span className="font-black text-primary">THE DETECTIVE</span>
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/"
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  location === "/" ? "text-foreground" : "text-foreground/60"
                )}
              >
                Analyze
              </Link>
              <Link
                href="/history"
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  location === "/history" ? "text-foreground" : "text-foreground/60"
                )}
              >
                History
              </Link>
            </nav>
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle theme"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/50 bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
