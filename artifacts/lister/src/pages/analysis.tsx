import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrustScore } from "@/components/trust-score";
import { PlatformIcon } from "@/components/platform-icon";
import {
  ArrowLeft, ExternalLink, AlertTriangle, ShieldAlert, ShieldCheck,
  Search, ScanLine, FileText, CheckCircle2, Activity
} from "lucide-react";

export default function Analysis() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : 0;

  const { data: analysis, isLoading, isError } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === "pending" || data.status === "processing")) {
          return 2000;
        }
        return false;
      }
    }
  });

  // Track elapsed seconds so loading steps advance realistically
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (analysis && (analysis.status === "pending" || analysis.status === "processing")) {
      setElapsed(0);
      const interval = setInterval(() => setElapsed(s => s + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [analysis?.status]);

  if (isLoading || !analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20">
        <Activity className="w-12 h-12 text-primary animate-pulse mb-6" />
        <h2 className="text-xl font-bold font-mono tracking-tight">Initializing Scanner...</h2>
      </div>
    );
  }

  if (isError || analysis.status === "failed") {
    return (
      <div className="container max-w-3xl mx-auto py-16 px-4">
        <Button variant="ghost" asChild className="mb-8 font-mono text-xs uppercase tracking-wider">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Search</Link>
        </Button>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
            <h2 className="text-2xl font-bold mb-2">Analysis Failed</h2>
            <p className="text-muted-foreground font-mono mb-4 max-w-md mx-auto">
              {analysis.errorMessage || "We couldn't complete the background check on this product."}
            </p>
            <p className="text-muted-foreground/70 font-mono text-xs mb-8 max-w-md mx-auto">
              Tip: If you used a short link (e.g. amzn.eu/...), try pasting the full product URL directly from the browser address bar instead.
            </p>
            <Button asChild className="font-mono text-sm tracking-widest uppercase">
              <Link href="/">Try Another Product</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analysis.status === "pending" || analysis.status === "processing") {
    const steps = [
      { icon: ScanLine, text: "Extracting listing data & product identity..." },
      { icon: FileText, text: "Analyzing seller history & reputation..." },
      { icon: ShieldAlert, text: "Cross-referencing reviews for manipulation..." },
      { icon: Search, text: "Searching for the same product on other platforms..." },
    ];

    // Each step takes ~7 seconds; advance linearly, cap at last step
    const activeStep = Math.min(Math.floor(elapsed / 7), steps.length - 1);

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Search className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold font-sans tracking-tighter mb-3">Detective at work</h2>
            <p className="text-muted-foreground font-mono text-sm">Running a full background check — hang tight.</p>
          </div>

          <div className="space-y-4 border border-border/50 rounded-xl p-6 bg-card/50 backdrop-blur-sm shadow-xl">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isDone = index < activeStep;
              const isActive = index === activeStep;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-4 transition-all duration-700 ${
                    isActive ? "opacity-100" : isDone ? "opacity-60" : "opacity-20"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isDone
                      ? "bg-green-500/20 text-green-400"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
                    }
                  </div>
                  <span className="font-mono text-sm">{step.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const result = analysis.result;
  if (!result) return null;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <Button variant="ghost" asChild className="mb-6 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> New Search</Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {result.platform && (
              <Badge variant="outline" className="px-3 py-1 font-mono uppercase tracking-wider text-xs border-primary/30 text-primary">
                <PlatformIcon platform={result.platform} className="w-3 h-3 mr-1.5" />
                {result.platform}
              </Badge>
            )}
            <Badge variant="secondary" className="px-3 py-1 font-mono uppercase tracking-wider text-xs">
              {result.brand}
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold font-sans tracking-tight leading-tight">
            {result.productTitle}
          </h1>

          {analysis.url && (
            <a
              href={analysis.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-mono text-primary hover:underline"
            >
              View Original Listing <ExternalLink className="w-3 h-3 ml-1.5" />
            </a>
          )}

          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-foreground/80 font-mono text-sm leading-relaxed">
            {result.summary}
          </div>
        </div>

        <Card className="w-full lg:w-72 shrink-0 border-border/50 shadow-xl bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${
            result.verdict === "recommended" ? "bg-green-500" :
            result.verdict === "caution" ? "bg-yellow-500" : "bg-red-500"
          }`} />
          <CardContent className="p-8 flex flex-col items-center text-center">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-6">Trust Index</h3>
            <TrustScore score={result.overallTrustScore} size="lg" showLabel className="mb-6" />
            <div className="w-full pt-6 border-t border-border/50">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground block mb-2">Est. Price</span>
              <span className="text-2xl font-bold font-sans">{result.estimatedPrice || "Unknown"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Red Flags */}
      {result.redFlags && result.redFlags.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold font-sans mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Detective Findings: Red Flags
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.redFlags.map((flag, idx) => {
              const severityStyles = {
                high: {
                  wrapper: "bg-red-500/10 border-red-500/30",
                  icon: "text-red-400",
                  badge: "bg-red-500 text-white hover:bg-red-500",
                  text: "text-foreground",
                },
                medium: {
                  wrapper: "bg-yellow-500/10 border-yellow-500/30",
                  icon: "text-yellow-400",
                  badge: "bg-yellow-400 text-black hover:bg-yellow-400",
                  text: "text-foreground",
                },
                low: {
                  wrapper: "bg-muted border-border",
                  icon: "text-muted-foreground",
                  badge: "bg-secondary text-secondary-foreground hover:bg-secondary",
                  text: "text-foreground",
                },
              }[flag.severity] ?? {
                wrapper: "bg-muted border-border",
                icon: "text-muted-foreground",
                badge: "bg-secondary text-secondary-foreground hover:bg-secondary",
                text: "text-foreground",
              };

              return (
                <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${severityStyles.wrapper}`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${severityStyles.icon}`} />
                  <div>
                    <Badge className={`mb-2 font-mono text-[10px] uppercase tracking-wider ${severityStyles.badge}`}>
                      {flag.severity} Risk
                    </Badge>
                    <p className={`text-sm font-medium ${severityStyles.text}`}>{flag.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      <Tabs defaultValue="seller" className="mb-16">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="seller" className="py-3 font-mono text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Seller Rep</TabsTrigger>
          <TabsTrigger value="specs" className="py-3 font-mono text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Specs Reality</TabsTrigger>
          <TabsTrigger value="reviews" className="py-3 font-mono text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Review Auth</TabsTrigger>
          <TabsTrigger value="brand" className="py-3 font-mono text-xs uppercase tracking-wider rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Brand Trust</TabsTrigger>
        </TabsList>

        <div className="p-6 md:p-8 border border-border/50 rounded-2xl bg-card shadow-sm">
          <TabsContent value="seller" className="mt-0">
            <h3 className="text-lg font-bold mb-4 font-sans flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" /> Seller Analysis
            </h3>
            <p className="text-muted-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">{result.sellerAnalysis}</p>
          </TabsContent>
          <TabsContent value="specs" className="mt-0">
            <h3 className="text-lg font-bold mb-4 font-sans flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Specifications Check
            </h3>
            <p className="text-muted-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">{result.specsAnalysis}</p>
          </TabsContent>
          <TabsContent value="reviews" className="mt-0">
            <h3 className="text-lg font-bold mb-4 font-sans flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" /> Reviews Authenticity
            </h3>
            <p className="text-muted-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">{result.reviewsAnalysis}</p>
          </TabsContent>
          <TabsContent value="brand" className="mt-0">
            <h3 className="text-lg font-bold mb-4 font-sans flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Brand Verification
            </h3>
            <p className="text-muted-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">{result.brandTrustAnalysis}</p>
          </TabsContent>
        </div>
      </Tabs>

      {/* Alternatives — same product, better platform/seller */}
      {result.alternatives && result.alternatives.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
            <div>
              <h2 className="text-2xl font-bold font-sans">Same Product, Better Source</h2>
              <p className="text-muted-foreground font-mono text-xs mt-1 uppercase tracking-wider">Tap any card to search that platform</p>
            </div>
            <Badge variant="outline" className="font-mono text-xs text-green-400 border-green-400/30 bg-green-400/5 px-3 py-1">
              AI Curated
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {result.alternatives.map((alt, idx) => (
              <a
                key={idx}
                href={alt.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <Card className="overflow-hidden border-border/50 shadow-md hover:border-primary/50 hover:shadow-primary/10 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-0 h-full flex flex-col">
                    <div className="p-5 flex gap-4 flex-1">
                      <div className="shrink-0 flex flex-col items-center">
                        <div className="text-xs font-mono font-bold text-muted-foreground mb-2">Score</div>
                        <TrustScore score={alt.trustScore} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-mono tracking-wider shrink-0">
                            <PlatformIcon platform={alt.platform} className="w-2.5 h-2.5 mr-1" />
                            {alt.platform}
                          </Badge>
                          {alt.price && <span className="font-mono font-bold text-sm text-primary whitespace-nowrap">{alt.price}</span>}
                        </div>
                        <h4 className="font-bold text-sm leading-snug mb-1 line-clamp-2" title={alt.title}>{alt.title}</h4>
                        <span className="text-xs text-muted-foreground font-mono">{alt.brand}</span>
                      </div>
                    </div>

                    <div className="bg-muted/30 px-5 py-3 border-t border-border/50 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed flex-1">{alt.whyBetter}</p>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors mt-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
