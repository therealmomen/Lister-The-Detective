import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrustScore } from "@/components/trust-score";
import { PlatformIcon } from "@/components/platform-icon";
import { 
  ArrowLeft, ExternalLink, AlertTriangle, ShieldAlert, ShieldCheck, 
  Search, ScanLine, FileText, CheckCircle2, ChevronRight, Activity
} from "lucide-react";

export default function Analysis() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : 0;
  
  // Use polling if status is pending/processing
  const { data: analysis, isLoading, isError } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === "pending" || data.status === "processing")) {
          return 2000; // Poll every 2 seconds
        }
        return false;
      }
    }
  });

  const [loadingStep, setLoadingStep] = useState(0);

  // Cycle through loading steps for a more engaging UX
  useEffect(() => {
    if (analysis && (analysis.status === "pending" || analysis.status === "processing")) {
      const interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % 4);
      }, 3000);
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
            <p className="text-muted-foreground font-mono mb-8 max-w-md mx-auto">
              {analysis.errorMessage || "We couldn't complete the background check on this product. The listing might have been removed or is temporarily inaccessible."}
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
      { icon: ScanLine, text: "Extracting listing data..." },
      { icon: FileText, text: "Analyzing seller history & reputation..." },
      { icon: ShieldAlert, text: "Cross-referencing reviews for manipulation..." },
      { icon: Search, text: "Scouting verified alternatives..." }
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Search className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold font-sans tracking-tighter mb-3">Detective at work</h2>
            <p className="text-muted-foreground font-mono text-sm">Please wait while we run a full background check on this item.</p>
          </div>

          <div className="space-y-4 border border-border/50 rounded-xl p-6 bg-card/50 backdrop-blur-sm shadow-xl">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === loadingStep;
              const isPast = index < loadingStep;
              
              return (
                <div key={index} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'opacity-100 scale-105' : isPast ? 'opacity-50' : 'opacity-20'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground' : isPast ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
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

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row gap-8 items-start mb-12">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            {result.platform && (
              <Badge variant="outline" className="px-3 py-1 font-mono uppercase tracking-wider text-xs border-primary/30 text-primary">
                <PlatformIcon platform={result.platform} className="w-3 h-3 mr-1.5" />
                {result.platform}
              </Badge>
            )}
            <Badge variant="secondary" className="px-3 py-1 font-mono uppercase tracking-wider text-xs">
              Brand: {result.brand}
            </Badge>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold font-sans tracking-tight leading-tight">
            {result.productTitle}
          </h1>
          
          {analysis.url && (
            <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-mono text-primary hover:underline">
              View Original Listing <ExternalLink className="w-3 h-3 ml-1.5" />
            </a>
          )}
          
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-muted-foreground font-mono text-sm leading-relaxed">
            {result.summary}
          </div>
        </div>

        <Card className="w-full lg:w-80 shrink-0 border-border/50 shadow-xl bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${
            result.verdict === 'recommended' ? 'bg-success' : 
            result.verdict === 'caution' ? 'bg-warning' : 'bg-destructive'
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

      {/* Red Flags Section */}
      {result.redFlags && result.redFlags.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold font-sans mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Detective Findings: Red Flags
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.redFlags.map((flag, idx) => (
              <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${
                flag.severity === 'high' ? 'bg-destructive/10 border-destructive/20 text-destructive-foreground' :
                flag.severity === 'medium' ? 'bg-warning/10 border-warning/20 text-warning-foreground' :
                'bg-muted border-border'
              }`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  flag.severity === 'high' ? 'text-destructive' :
                  flag.severity === 'medium' ? 'text-warning' :
                  'text-muted-foreground'
                }`} />
                <div>
                  <Badge className={`mb-2 font-mono text-[10px] uppercase tracking-wider ${
                    flag.severity === 'high' ? 'bg-destructive hover:bg-destructive text-destructive-foreground' :
                    flag.severity === 'medium' ? 'bg-warning hover:bg-warning text-warning-foreground' :
                    'bg-secondary hover:bg-secondary text-secondary-foreground'
                  }`}>
                    {flag.severity} Risk
                  </Badge>
                  <p className="text-sm font-medium">{flag.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Breakdown Tabs */}
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

      {/* Alternatives Section */}
      {result.alternatives && result.alternatives.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
            <h2 className="text-2xl font-bold font-sans">Verified Better Alternatives</h2>
            <Badge variant="outline" className="font-mono text-xs text-success border-success/30 bg-success/5 px-3 py-1">
              Curated by AI
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.alternatives.map((alt, idx) => (
              <Card key={idx} className="overflow-hidden border-border/50 shadow-md hover:border-primary/40 transition-colors group">
                <CardContent className="p-0">
                  <div className="p-6 pb-5 flex gap-4">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="text-xs font-mono font-bold text-muted-foreground mb-2">Score</div>
                      <TrustScore score={alt.trustScore} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-mono tracking-wider">
                          <PlatformIcon platform={alt.platform} className="w-2.5 h-2.5 mr-1" />
                          {alt.platform}
                        </Badge>
                        {alt.price && <span className="font-mono font-bold text-sm text-primary">{alt.price}</span>}
                      </div>
                      <h4 className="font-bold text-base leading-tight mb-1 truncate" title={alt.title}>{alt.title}</h4>
                      <span className="text-xs text-muted-foreground font-mono">{alt.brand}</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/40 p-4 border-t border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed">{alt.whyBetter}</p>
                    </div>
                    {alt.url && (
                      <Button size="sm" asChild className="shrink-0 font-mono text-xs uppercase tracking-wider group-hover:bg-primary/90 transition-colors">
                        <a href={alt.url} target="_blank" rel="noopener noreferrer">
                          View <ChevronRight className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
