import React from "react";
import { Link, useLocation } from "wouter";
import { Search, History as HistoryIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block font-mono tracking-tight text-lg">
                LISTER
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
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
