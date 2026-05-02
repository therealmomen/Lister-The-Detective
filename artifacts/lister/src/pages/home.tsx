import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Link as LinkIcon, ArrowRight, ShieldCheck, Activity, Target } from "lucide-react";

import { useCreateAnalysis, useListAnalyses, useGetAnalysisStats } from "@workspace/api-client-react";
import type { CreateAnalysisBodyPlatformsItem } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisCard } from "@/components/analysis-card";
import { PlatformIcon } from "@/components/platform-icon";

const formSchema = z.object({
  input: z.string().min(3, "Please enter a valid URL or search query"),
  platforms: z.array(z.enum(["amazon", "ebay", "noon", "alibaba"])).min(1, "Select at least one platform"),
});

export default function Home() {
  const [, setLocation] = useLocation();
  const [inputType, setInputType] = useState<"url" | "query">("url");

  const createAnalysis = useCreateAnalysis();
  const { data: recentAnalyses, isLoading: loadingAnalyses } = useListAnalyses({ limit: 4 });
  const { data: stats } = useGetAnalysisStats();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      input: "",
      platforms: ["amazon", "noon"],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const isUrl = values.input.startsWith("http://") || values.input.startsWith("https://");
    
    createAnalysis.mutate(
      {
        data: {
          url: isUrl ? values.input : null,
          query: !isUrl ? values.input : null,
          platforms: values.platforms as CreateAnalysisBodyPlatformsItem[],
          country: "EG", // Defaulting for the Egyptian context
        },
      },
      {
        onSuccess: (data) => {
          setLocation(`/analysis/${data.id}`);
        },
      }
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        
        <div className="container relative z-10 max-w-5xl mx-auto px-4 text-center">
          <Badge className="mb-6 py-1.5 px-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 transition-colors">
            <ShieldCheck className="w-4 h-4 mr-2" />
            AI-Powered Product Detective
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground mb-6 font-sans">
            Don't get scammed.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              Buy with confidence.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-mono">
            Paste a product URL or search query. We analyze seller reputation, fake reviews, and specs to find you verified better alternatives.
          </p>

          <Card className="max-w-3xl mx-auto border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs value={inputType} onValueChange={(v) => setInputType(v as "url" | "query")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="url" className="font-mono text-xs uppercase tracking-wider">Product URL</TabsTrigger>
                      <TabsTrigger value="query" className="font-mono text-xs uppercase tracking-wider">Search Query</TabsTrigger>
                    </TabsList>
                    
                    <FormField
                      control={form.control}
                      name="input"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              {inputType === "url" ? (
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                              ) : (
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                              )}
                              <Input 
                                placeholder={inputType === "url" ? "Paste your product link here..." : "e.g. Sony WH-1000XM6 noise cancelling headphones"} 
                                className="pl-12 h-14 text-lg bg-background/50 border-input font-mono"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Tabs>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-mono tracking-widest text-muted-foreground">Search platforms for alternatives</label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { id: "amazon", label: "Amazon" },
                          { id: "noon", label: "Noon" },
                          { id: "ebay", label: "eBay" },
                          { id: "alibaba", label: "Alibaba" },
                        ].map((platform) => (
                          <FormField
                            key={platform.id}
                            control={form.control}
                            name="platforms"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={platform.id}
                                  className="flex flex-row items-center space-x-2 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(platform.id as any)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, platform.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== platform.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer flex items-center gap-1.5">
                                    <PlatformIcon platform={platform.id} className="w-4 h-4" />
                                    <span>{platform.label}</span>
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      {form.formState.errors.platforms && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.platforms.message}</p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full sm:w-auto h-12 px-8 font-mono text-sm tracking-wider uppercase"
                      disabled={createAnalysis.isPending}
                    >
                      {createAnalysis.isPending ? (
                        <div className="w-5 h-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin mr-2" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      Analyze
                      <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {stats && (
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-border/50 pt-8">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold font-mono text-primary">{stats.totalAnalyses.toLocaleString()}</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Products Analyzed</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold font-mono text-primary">{stats.avgTrustScore ? Math.round(stats.avgTrustScore) : '--'}</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Avg Trust Score</span>
              </div>
              <div className="flex flex-col items-center col-span-2 md:col-span-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Top Platforms Evaluated</span>
                <div className="flex gap-4">
                  {stats.topPlatforms.map(p => (
                    <div key={p.platform} className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
                      <PlatformIcon platform={p.platform} className="w-5 h-5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Analyses Section */}
      <section className="py-16 bg-muted/30 flex-1">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold font-sans tracking-tight">Recent Findings</h2>
              <p className="text-muted-foreground text-sm font-mono mt-1">Latest reports generated by Lister</p>
            </div>
            <Button variant="outline" asChild className="font-mono text-xs uppercase tracking-wider hidden sm:flex">
              <Link href="/history">View History</Link>
            </Button>
          </div>

          {loadingAnalyses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[200px] rounded-xl bg-card border border-border/50 animate-pulse" />
              ))}
            </div>
          ) : recentAnalyses && recentAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentAnalyses.map(analysis => (
                <AnalysisCard key={analysis.id} analysis={analysis} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed rounded-xl border-border/50">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No analyses yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Be the first to analyze a product</p>
            </div>
          )}
          
          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline" asChild className="w-full font-mono text-xs uppercase tracking-wider">
              <Link href="/history">View History</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Temporary inline Badge component until shadcn ui component is configured properly
function Badge({ className, children }: { className?: string, children: React.ReactNode }) {
  return <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</div>
}
