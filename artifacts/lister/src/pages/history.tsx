import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetAnalysis } from "@workspace/api-client-react";
import type { Analysis } from "@workspace/api-client-react";
import { AnalysisCard } from "@/components/analysis-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, History as HistoryIcon, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  getLocalHistoryIds,
  removeFromLocalHistory,
  clearLocalHistory,
} from "@/hooks/use-local-history";

// Fetches a single analysis by ID and renders it (or nothing while loading/failed)
function HistoryItem({
  id,
  onRemove,
  search,
  filterVerdict,
  filterPlatform,
}: {
  id: number;
  onRemove: (id: number) => void;
  search: string;
  filterVerdict: string;
  filterPlatform: string;
}) {
  const { data: analysis } = useGetAnalysis(id, {
    query: {
      retry: 1,
      staleTime: 60_000,
    },
  });

  if (!analysis) return null;

  // Apply filters client-side
  const result = analysis.result as any;
  if (search) {
    const s = search.toLowerCase();
    const matches =
      analysis.query?.toLowerCase().includes(s) ||
      analysis.url?.toLowerCase().includes(s) ||
      result?.productTitle?.toLowerCase().includes(s);
    if (!matches) return null;
  }
  if (filterVerdict !== "all" && result?.verdict !== filterVerdict) return null;
  if (filterPlatform !== "all" && result?.platform?.toLowerCase() !== filterPlatform) return null;

  return (
    <div className="relative group/card">
      <AnalysisCard analysis={analysis as Analysis} />
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(id); }}
        className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-md bg-background/80 border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
        title="Remove from history"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function History() {
  const [ids, setIds] = useState<number[]>(() => getLocalHistoryIds());
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterVerdict, setFilterVerdict] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");

  // Re-read from localStorage if the user navigates back (e.g. after a new analysis)
  useEffect(() => {
    const onFocus = () => setIds(getLocalHistoryIds());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function handleRemove(id: number) {
    removeFromLocalHistory(id);
    setIds(getLocalHistoryIds());
  }

  function handleClearAll() {
    clearLocalHistory();
    setIds([]);
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4 flex-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-border pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1.5 flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-primary" />
            My History
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {ids.length === 0
              ? "Your analyses are stored privately in this browser."
              : `${ids.length} analysis${ids.length !== 1 ? "es" : ""} — stored privately in this browser.`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9 font-mono text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterVerdict} onValueChange={setFilterVerdict}>
            <SelectTrigger className="w-full sm:w-[140px] font-mono text-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-muted-foreground" />
                <SelectValue placeholder="Verdict" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verdicts</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="caution">Caution</SelectItem>
              <SelectItem value="avoid">Avoid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-full sm:w-[140px] font-mono text-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-muted-foreground" />
                <SelectValue placeholder="Platform" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="amazon">Amazon</SelectItem>
              <SelectItem value="noon">Noon</SelectItem>
              <SelectItem value="ebay">eBay</SelectItem>
              <SelectItem value="alibaba">Alibaba</SelectItem>
            </SelectContent>
          </Select>

          {ids.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive/40 gap-2 whitespace-nowrap self-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {ids.length === 0 ? (
        <div className="text-center py-24 border border-dashed rounded-xl border-border/50 bg-muted/10">
          <HistoryIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No history yet</h3>
          <p className="text-sm text-muted-foreground font-mono mb-6 max-w-sm mx-auto">
            Analyses you run will appear here. They're saved only in this browser — nobody else can see them.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-mono uppercase tracking-wider"
          >
            Analyze a product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {ids.map((id) => (
            <HistoryItem
              key={id}
              id={id}
              onRemove={handleRemove}
              search={debouncedSearch}
              filterVerdict={filterVerdict}
              filterPlatform={filterPlatform}
            />
          ))}
        </div>
      )}
    </div>
  );
}
