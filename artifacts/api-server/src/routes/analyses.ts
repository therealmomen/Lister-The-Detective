import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, analysesTable } from "@workspace/db";
import {
  CreateAnalysisBody,
  ListAnalysesQueryParams,
  GetAnalysisParams,
  DeleteAnalysisParams,
} from "@workspace/api-zod";
import { analyzeProduct } from "../lib/analyzer";

const router: IRouter = Router();

// ─── Stats cache (60s TTL) ───────────────────────────────────────────────────
let statsCache: { data: unknown; expiresAt: number } | null = null;

function invalidateStatsCache() {
  statsCache = null;
}

router.get("/analyses", async (req, res): Promise<void> => {
  const parsed = ListAnalysesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit, offset } = parsed.data;
  const analyses = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(analyses);
});

router.get("/analyses/stats", async (_req, res): Promise<void> => {
  // Serve from cache if still fresh
  if (statsCache && Date.now() < statsCache.expiresAt) {
    res.json(statsCache.data);
    return;
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analysesTable);

  const [completedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analysesTable)
    .where(eq(analysesTable.status, "completed"));

  const [avgRow] = await db
    .select({ avg: sql<number | null>`avg((result->>'overallTrustScore')::float)` })
    .from(analysesTable)
    .where(eq(analysesTable.status, "completed"));

  const platformCounts = await db
    .select({
      platform: sql<string>`unnest(platforms)`,
      count: sql<number>`count(*)::int`,
    })
    .from(analysesTable)
    .groupBy(sql`unnest(platforms)`)
    .orderBy(desc(sql`count(*)`))
    .limit(4);

  const recentActivity = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(5);

  const payload = {
    totalAnalyses: totalRow?.count ?? 0,
    completedAnalyses: completedRow?.count ?? 0,
    avgTrustScore: avgRow?.avg ?? null,
    topPlatforms: platformCounts.map((r) => ({ platform: r.platform, count: r.count })),
    recentActivity,
  };

  statsCache = { data: payload, expiresAt: Date.now() + 60_000 };
  res.json(payload);
});

router.post("/analyses", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, query, platforms, country } = parsed.data;

  if (!url && !query) {
    res.status(400).json({ error: "Either url or query is required" });
    return;
  }

  const [analysis] = await db
    .insert(analysesTable)
    .values({
      url: url ?? null,
      query: query ?? null,
      platforms: platforms ?? [],
      country: country ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(analysis);

  // Invalidate stats cache so the count increments are reflected promptly
  invalidateStatsCache();

  setImmediate(async () => {
    try {
      await db
        .update(analysesTable)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(analysesTable.id, analysis.id));

      const result = await analyzeProduct(url, query, platforms ?? [], country);

      await db
        .update(analysesTable)
        .set({ status: "completed", result, updatedAt: new Date() })
        .where(eq(analysesTable.id, analysis.id));

      invalidateStatsCache();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      req.log
        ? req.log.error({ err, analysisId: analysis.id }, "Analysis failed")
        : console.error("Analysis failed", err);

      await db
        .update(analysesTable)
        .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
        .where(eq(analysesTable.id, analysis.id));

      invalidateStatsCache();
    }
  });
});

router.get("/analyses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAnalysisParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, params.data.id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  res.json(analysis);
});

router.delete("/analyses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAnalysisParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(analysesTable)
    .where(eq(analysesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  invalidateStatsCache();
  res.sendStatus(204);
});

export default router;
