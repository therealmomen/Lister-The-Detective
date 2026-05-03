import { Link } from "wouter";
import { ShieldCheck, Search, AlertTriangle, ExternalLink, Clock, MapPin, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 overflow-hidden bg-background border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background" />
        <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest mb-8">
            <ShieldCheck className="w-3.5 h-3.5" />
            The Story
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-6">
            Born from 3 hours<br />
            <span className="text-primary">lost in Amazon Egypt.</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            One afternoon, looking for a simple laptop cooling pad in Egypt, I spent three hours going in circles — dozens of listings, conflicting reviews, unknown brands, suspicious specs, and no way to know who to trust. I bought the wrong one. Lister the Detective exists so that never happens to anyone again.
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-16 bg-background">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-2 tracking-tight">The problem with online shopping in Egypt</h2>
          <p className="text-muted-foreground font-mono text-sm mb-10">And really, anywhere that's not a major Western market.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              {
                icon: AlertTriangle,
                color: "text-red-400",
                bg: "bg-red-400/10",
                title: "Fake reviews everywhere",
                desc: "Products with 4.8★ from 2,000 reviews that are all one-liners posted on the same week. Impossible to trust the number.",
              },
              {
                icon: MapPin,
                color: "text-yellow-400",
                bg: "bg-yellow-400/10",
                title: "No local warranty reality",
                desc: "A product might show 'official warranty' in the listing but local service centers don't recognize it. You're on your own.",
              },
              {
                icon: Clock,
                color: "text-blue-400",
                bg: "bg-blue-400/10",
                title: "Hours wasted comparing",
                desc: "The research burden is entirely on the buyer. Most people either give up and guess, or spend hours they don't have.",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="p-5 rounded-2xl border border-border/50 bg-card">
                  <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4.5 h-4.5 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How the Detective Works */}
      <section className="py-16 bg-muted/20 border-t border-border/30">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">How the Detective actually works</h2>
          </div>
          <p className="text-muted-foreground font-mono text-sm mb-10 ml-8">And what it honestly cannot do.</p>

          <div className="space-y-6">
            {[
              {
                label: "What it CAN do",
                positive: true,
                points: [
                  "Search the web in real time for current prices, recent reviews, and known product issues",
                  "Tell you everything known about a brand's reputation, manufacturing quality, and track record",
                  "Flag when a product's specs are implausible for its price tier (physics doesn't lie)",
                  "Explain typical seller behavior and platform norms for a product category",
                  "Identify review manipulation patterns known for this brand or category",
                  "Find the same product on other platforms so you can compare where to buy",
                  "Give you a transparent trust score with the exact reasoning behind it",
                ],
              },
              {
                label: "What it CANNOT do",
                positive: false,
                points: [
                  "Access the actual listing page or read your specific seller's account details (yet)",
                  "Guarantee live prices are accurate by the time you check — always verify before buying",
                  "Guarantee a product is in stock or available on a given platform right now",
                  "Replace your own judgment — use this as one strong input, not the final word",
                ],
              },
            ].map((section, i) => (
              <Card key={i} className={`border-border/50 ${section.positive ? "bg-green-500/5" : "bg-red-500/5"}`}>
                <CardContent className="p-6">
                  <h3 className={`font-bold font-mono text-sm uppercase tracking-wider mb-4 ${section.positive ? "text-green-400" : "text-red-400"}`}>
                    {section.positive ? "✓" : "✗"} {section.label}
                  </h3>
                  <ul className="space-y-2">
                    {section.points.map((pt, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground font-mono leading-relaxed">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${section.positive ? "bg-green-400" : "bg-red-400"}`} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="py-16 bg-background border-t border-border/30">
        <div className="container max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Platforms we cover</h2>
          <p className="text-muted-foreground font-mono text-sm mb-8">Paste a URL from any of these and get a full background check.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {[
              { name: "Amazon Egypt", url: "amazon.eg", logo: "/logos/amazon.png" },
              { name: "Noon Egypt", url: "noon.com", logo: "/logos/noon.png" },
              { name: "eBay", url: "ebay.com", logo: "/logos/ebay.png" },
              { name: "Alibaba", url: "alibaba.com", logo: "/logos/alibaba.png" },
            ].map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1.5 shadow-sm">
                  <img src={p.logo} alt={p.name} className="w-full h-full object-contain" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.url}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="font-mono text-sm tracking-wider uppercase">
              <Link href="/">
                <Search className="w-4 h-4 mr-2" />
                Start Analyzing
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-mono text-sm tracking-wider uppercase">
              <Link href="/history">
                View Past Reports
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
