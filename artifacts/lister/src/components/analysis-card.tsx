import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrustScore } from "./trust-score";
import { PlatformIcon } from "./platform-icon";
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { Analysis } from "@workspace/api-client-react";

export function AnalysisCard({ analysis }: { analysis: Analysis }) {
  const isCompleted = analysis.status === "completed";
  const isFailed = analysis.status === "failed";
  const result = analysis.result;

  return (
    <Link href={`/analysis/${analysis.id}`} className="block group">
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-5 flex flex-col h-full gap-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold line-clamp-2 text-base group-hover:text-primary transition-colors">
                {result?.productTitle || analysis.query || analysis.url || "Unknown Product"}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>{formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}</span>
                {result?.platform && (
                  <>
                    <span>•</span>
                    <PlatformIcon platform={result.platform} className="h-3 w-3" />
                    <span>{result.platform}</span>
                  </>
                )}
              </div>
            </div>
            
            {isCompleted && result ? (
              <TrustScore score={result.overallTrustScore} size="sm" />
            ) : isFailed ? (
              <XCircle className="h-8 w-8 text-destructive" />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-border/50">
            {isCompleted && result ? (
              <div className="flex justify-between items-center text-sm">
                <span className="font-mono text-muted-foreground">{result.estimatedPrice || "Price unknown"}</span>
                {result.verdict === "recommended" && <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">Recommended</Badge>}
                {result.verdict === "caution" && <Badge variant="secondary" className="bg-warning text-warning-foreground hover:bg-warning/90">Caution</Badge>}
                {result.verdict === "avoid" && <Badge variant="destructive">Avoid</Badge>}
              </div>
            ) : isFailed ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Analysis failed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{analysis.status === "pending" ? "In queue..." : "Analyzing..."}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
