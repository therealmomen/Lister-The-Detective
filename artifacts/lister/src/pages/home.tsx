import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search, Link as LinkIcon, ArrowRight, ShieldCheck,
  ScanLine, ShieldAlert, FileText, Zap, AlertCircle
} from "lucide-react";

import { useCreateAnalysis, useGetAnalysisStats } from "@workspace/api-client-react";
import { addToLocalHistory } from "@/hooks/use-local-history";
import type { CreateAnalysisBodyPlatformsItem } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformIcon } from "@/components/platform-icon";

const SHORT_URL_HOSTS = ["amzn.eu", "amzn.to", "a.co", "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "rb.gy"];

function isShortUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return SHORT_URL_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

const formSchema = z.object({
  url: z
    .string()
    .min(3, "Please paste a full product URL")
    .refine(
      (val) => val.startsWith("http://") || val.startsWith("https://"),
      { message: "Must be a full URL starting with http:// or https://" }
    )
    .refine(
      (val) => !isShortUrl(val),
      { message: "Short links can't be analyzed. Copy the full URL from your browser's address bar." }
    ),
  platforms: z
    .array(z.enum(["amazon", "ebay", "noon", "alibaba"]))
    .min(1, "Select at least one platform"),
});

export default function Home() {
  const [, setLocation] = useLocation();

  const createAnalysis = useCreateAnalysis();
  const { data: stats } = useGetAnalysisStats();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      platforms: ["amazon", "noon"],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createAnalysis.mutate(
      {
        data: {
          url: values.url,
          query: null,
          platforms: values.platforms as CreateAnalysisBodyPlatformsItem[],
          country: "EG",
        },
      },
      {
        onSuccess: (data) => {
          addToLocalHistory(data.id);
          setLocation(`/analysis/${data.id}`);
        },
      }
    );
  }

  const features = [
    {
      icon: ScanLine,
      title: "Seller Deep-Dive",
      desc: "We check the seller's track record, fulfillment reliability, and return policy so you know exactly who you're buying from.",
    },
    {
      icon: ShieldAlert,
      title: "Fake Review Detection",
      desc: "Our AI spots patterns of review manipulation — paid reviews, review farms, and suspicious rating spikes.",
    },
    {
      icon: FileText,
      title: "Spec Reality Check",
      desc: "We flag specs that are exaggerated or physically impossible for the price point — protecting you from false advertising.",
    },
    {
      icon: ShieldCheck,
      title: "Brand Trust Score",
      desc: "We analyze brand reputation, warranty coverage, and after-sales support availability in your country.",
    },
    {
      icon: Search,
      title: "Same Product, Better Source",
      desc: "Instead of random alternatives, we find the EXACT same product on other platforms — so you buy smarter, not differently.",
    },
    {
      icon: Zap,
      title: "Instant Analysis",
      desc: "Full background check in under 30 seconds. Paste a link, hit analyze, and get a transparent verdict with reasoning.",
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <section className="relative py-12 sm:py-20 lg:py-28 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

        <div className="container relative z-10 max-w-5xl mx-auto px-4 text-center">
          <Badge className="mb-6 py-1.5 px-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 transition-colors">
            <ShieldCheck className="w-4 h-4 mr-2" />
            AI-Powered Product Detective
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground mb-6 font-sans">
            Don't get scammed.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              Buy with confidence.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-mono">
            Paste a product URL from Amazon, Noon, eBay, or Alibaba. We run a full background check and find you the best place to buy it.
          </p>

          <Card className="max-w-3xl mx-auto border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input
                              placeholder="Paste product link here (full URL from browser)..."
                              className="pl-12 h-14 text-base bg-background/50 border-input font-mono"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-[11px] text-muted-foreground/60 font-mono flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Shared/short links (amzn.eu, bit.ly…) won't work — use the full URL from your browser's address bar.
                        </p>
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-mono tracking-widest text-muted-foreground">
                        Search platforms for alternatives
                      </label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { id: "amazon", label: "Amazon" },
                          { id: "noon",   label: "Noon"   },
                          { id: "ebay",   label: "eBay"   },
                          { id: "alibaba",label: "Alibaba"},
                        ].map((platform) => (
                          <FormField
                            key={platform.id}
                            control={form.control}
                            name="platforms"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform.id as any)}
                                    onCheckedChange={(checked) =>
                                      checked
                                        ? field.onChange([...field.value, platform.id])
                                        : field.onChange(field.value?.filter((v) => v !== platform.id))
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer flex items-center gap-1.5">
                                  <PlatformIcon platform={platform.id} className="w-4 h-4" />
                                  <span>{platform.label}</span>
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      {form.formState.errors.platforms && (
                        <p className="text-sm font-medium text-destructive">
                          {form.formState.errors.platforms.message}
                        </p>
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

          {stats && (stats.totalAnalyses > 0 || stats.avgTrustScore) && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 border-t border-border/40 pt-8">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold font-mono text-primary">{stats.totalAnalyses.toLocaleString()}</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Products Analyzed</span>
              </div>
              {stats.avgTrustScore && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold font-mono text-primary">{Math.round(stats.avgTrustScore)}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Avg Trust Score</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* What the detective checks */}
      <section className="py-20 bg-muted/20 flex-1 border-t border-border/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-sans tracking-tight mb-3">What the detective checks</h2>
            <p className="text-muted-foreground font-mono text-sm max-w-xl mx-auto">
              Every analysis runs six independent checks before giving you a verdict.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}>
      {children}
    </div>
  );
}
