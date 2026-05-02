import { useState } from "react";
import { Link } from "wouter";
import { useListAnalyses } from "@workspace/api-client-react";
import { AnalysisCard } from "@/components/analysis-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, History as HistoryIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const { data: analyses, isLoading } = useListAnalyses();

  const filteredAnalyses = analyses?.filter(analysis => {
    // Search filter
    const searchMatch = !debouncedSearch || 
      analysis.query?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      analysis.url?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      analysis.result?.productTitle.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    // Verdict filter
    const verdictMatch = filterVerdict === "all" || 
      (analysis.result && analysis.result.verdict === filterVerdict);
    
    // Platform filter
    const platformMatch = filterPlatform === "all" || 
      (analysis.result && analysis.result.platform?.toLowerCase().includes(filterPlatform.toLowerCase()));

    return searchMatch && verdictMatch && platformMatch;
  });

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4 flex-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-border pb-8">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight mb-2 flex items-center gap-3">
            <HistoryIcon className="w-8 h-8 text-primary" />
            Analysis History
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Review past product evaluations and alternatives.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-9 font-mono text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-[220px] rounded-xl bg-card border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : filteredAnalyses && filteredAnalyses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAnalyses.map(analysis => (
             <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border border-dashed rounded-xl border-border/50 bg-muted/10">
          <HistoryIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No analyses found</h3>
          <p className="text-sm text-muted-foreground mb-6">Try adjusting your filters or search term.</p>
          <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-mono uppercase tracking-wider">
            Analyze a new product
          </Link>
        </div>
      )}
    </div>
  );
}
