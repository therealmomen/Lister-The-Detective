import { openai } from "@workspace/integrations-openai-ai-server";

export interface AnalysisResult {
  productTitle: string;
  brand: string;
  platform: string | null;
  estimatedPrice: string | null;
  overallTrustScore: number;
  verdict: "recommended" | "caution" | "avoid";
  summary: string;
  disclaimer: string;
  liveDataUsed: boolean;
  sellerAnalysis: string;
  specsAnalysis: string;
  reviewsAnalysis: string;
  brandTrustAnalysis: string;
  redFlags: Array<{
    severity: "low" | "medium" | "high";
    description: string;
    basis: "known_fact" | "pattern" | "inference" | "live_data";
  }>;
  alternatives: Array<{
    title: string;
    platform: string;
    url: string | null;
    price: string | null;
    rating: number | null;
    brand: string;
    whyBetter: string;
    trustScore: number;
  }>;
}

const SHORT_URL_PATTERNS = ["amzn.eu", "amzn.to", "amzn.com/d", "a.co/", "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "rb.gy"];
const UNKNOWN_LABELS = ["unknown", "unknown brand", "n/a", "na", "none", "not found", "unidentified", "generic"];

export function isShortUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return SHORT_URL_PATTERNS.some((p) => lower.includes(p));
}

function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("amazon.")) return "amazon";
  if (lower.includes("ebay.")) return "ebay";
  if (lower.includes("noon.")) return "noon";
  if (lower.includes("alibaba.")) return "alibaba";
  if (lower.includes("aliexpress.")) return "aliexpress";
  return null;
}

function extractProductNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const dpIndex = segments.findIndex((s) => s === "dp");
    if (dpIndex > 0) {
      const slug = segments[dpIndex - 1];
      if (slug && slug.length > 3 && !slug.startsWith("B0") && !/^\d+$/.test(slug)) {
        return slug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
      }
    }
    const itmIndex = segments.findIndex((s) => s === "itm");
    if (itmIndex >= 0 && segments[itmIndex + 1] && !/^\d+$/.test(segments[itmIndex + 1])) {
      return segments[itmIndex + 1].replace(/-/g, " ").replace(/\s+/g, " ").trim();
    }
    // Noon: /product-name-pXXXX
    const noonSlug = segments.find((s) => s.includes("-p") && /p\d+$/.test(s));
    if (noonSlug) {
      return noonSlug.replace(/-p\d+$/, "").replace(/-/g, " ").trim();
    }
    return null;
  } catch { return null; }
}

function detectCategory(productName: string): string {
  const text = productName.toLowerCase();
  if (/headphone|earphone|earbuds|airpod|speaker|wh-|wf-|xm\d/i.test(text)) return "audio";
  if (/laptop|notebook|macbook|thinkpad|cooling pad|cooler/i.test(text)) return "laptop";
  if (/phone|iphone|samsung|galaxy|pixel|xiaomi|redmi|realme/i.test(text)) return "smartphone";
  if (/watch|smartwatch|band|fitness tracker/i.test(text)) return "wearable";
  if (/camera|lens|tripod|gimbal/i.test(text)) return "camera";
  if (/charger|cable|powerbank|power bank|adapter|hub/i.test(text)) return "accessory";
  if (/keyboard|mouse|monitor|webcam/i.test(text)) return "computer_peripheral";
  if (/tv|television|projector/i.test(text)) return "display";
  return "electronics";
}

function generateSearchUrl(platform: string, productTitle: string): string {
  const query = encodeURIComponent(productTitle);
  switch (platform.toLowerCase()) {
    case "amazon":     return `https://www.amazon.eg/s?k=${query}`;
    case "noon":       return `https://www.noon.com/egypt-en/search/?q=${query}`;
    case "ebay":       return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    case "alibaba":    return `https://www.alibaba.com/trade/search?SearchText=${query}`;
    case "aliexpress": return `https://www.aliexpress.com/wholesale?SearchText=${query}`;
    default:           return `https://www.google.com/search?q=${encodeURIComponent(productTitle + " " + platform)}`;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function extractJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return s.slice(start, end + 1);
  return s;
}

function isUnknownText(value: string | null | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return UNKNOWN_LABELS.some((label) => normalized === label || normalized.includes(label));
}

/** Use OpenAI Responses API with web_search_preview to fetch live product context */
async function fetchLiveContext(
  productName: string,
  platform: string | null,
  country: string
): Promise<string | null> {
  const searchQuery = [
      `"${productName}"`,
      platform ? `site:${platform}.com OR site:${platform}.eg` : "",
      `price ${country} reviews issues 2025`,
      `seller warranty specs listing ASIN model`,
    ].filter(Boolean).join(" ");
  const response = await withTimeout(
    (openai as any).responses.create({
      model: "gpt-5.4",
      tools: [{ type: "web_search_preview" }],
      tool_choice: { type: "web_search_preview" },
      input: `You are a product research assistant. Search the web exhaustively and find current, factual information about: "${productName}".

Find and summarize:
1. Current prices in ${country} (in EGP if available)
2. Recent customer reviews and complaints (2024-2025)
3. Any known defects, recalls, or quality issues reported recently
4. Brand reputation updates or news
5. Availability on major platforms (Amazon Egypt, Noon, eBay)
6. Any price drops, deals, or alternatives spotted recently
7. Listing identifiers, model numbers, seller name, ASIN, and warranty clues if present

Be concise, factual, and cite what you found. If information is not available, say so.`,
      metadata: { searchQuery },
    }),
    70_000
  );

  let contextText = "";
  const output = (response as any).output ?? [];
  for (const item of output) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text" && c.text) {
          contextText += c.text + "\n";
        }
      }
    }
  }

  if (!contextText && (response as any).output_text) {
    contextText = (response as any).output_text;
  }

  return contextText.trim() || null;
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI model");
  return content;
}

export async function analyzeProduct(
  url: string | null | undefined,
  query: string | null | undefined,
  platforms: string[],
  country: string | null | undefined
): Promise<AnalysisResult> {
  if (url && isShortUrl(url)) {
    throw new Error("Short links cannot be analyzed. Please open the product in your browser and copy the full URL from the address bar.");
  }

  const platformDetected = url ? detectPlatform(url) : null;
  const platformsForAlts = platforms.length > 0 ? platforms : ["amazon", "ebay"];
  const countryContext = country === "EG" ? "Egypt" : country || "international";
  const extractedName = url ? extractProductNameFromUrl(url) : (query ?? null);
  const requestedName = query ?? extractedName ?? null;
  const canIdentify = !isUnknownText(extractedName) || !isUnknownText(requestedName) || !!platformDetected;
  if (!canIdentify) {
    return {
      productTitle: "Under Development",
      brand: "Unknown",
      platform: platformDetected,
      estimatedPrice: null,
      overallTrustScore: 0,
      verdict: "avoid",
      summary: "This product could not be identified with enough confidence to produce a reliable analysis. The project is still under development for this type of listing.",
      disclaimer: "This analysis could not confidently identify the item. The project is still under development for unidentified listings.",
      liveDataUsed: false,
      sellerAnalysis: "Insufficient listing detail to evaluate seller reliability.",
      specsAnalysis: "Insufficient listing detail to compare specifications.",
      reviewsAnalysis: "Insufficient listing detail to verify review patterns.",
      brandTrustAnalysis: "Insufficient listing detail to assess brand trust.",
      redFlags: [
        {
          severity: "high",
          description: "The item could not be identified confidently from the available listing details.",
          basis: "inference",
        },
      ],
      alternatives: [],
    };
  }
  const category = detectCategory(extractedName ?? "");

  // ── Phase 1: Fetch live context from web search (best-effort, ~15s budget) ──
  const liveContext = extractedName
    ? await fetchLiveContext(extractedName, platformDetected, countryContext)
    : null;
  const liveDataUnavailable = !!extractedName && !liveContext;

  const categoryHints: Record<string, string> = {
    audio: "Focus on ANC claims, driver size vs. price, codec support (aptX, LDAC), and Egypt warranty. Sony, Bose, Sennheiser have strong track records.",
    laptop: "Check thermal design, RAM/storage specs, CPU tier, and local service centers. Cooling pads quality control varies enormously.",
    smartphone: "Check IMEI for Egypt, software update commitment, official distributor vs. grey import, processor benchmark vs. price.",
    wearable: "Check if health sensors are medically validated, GPS accuracy claims, and companion app Egypt availability.",
    camera: "Verify sensor size claims, original brand vs. clone, regional warranty.",
    accessory: "Chargers/cables are high-risk — uncertified devices can damage hardware. Look for GCC/CE certification.",
    computer_peripheral: "Switch type for keyboards, DPI accuracy for mice, build quality.",
    display: "Panel type (IPS/TN/VA), response time accuracy, HDR certification legitimacy.",
    electronics: "Brand reputation, regional warranty, spec-to-price ratio.",
  };

  const productContext = [
    url ? `Product URL: ${url}` : null,
    platformDetected ? `Platform detected: ${platformDetected}` : null,
    extractedName ? `Product name from URL: "${extractedName}"` : null,
    !url && query ? `User search query: "${query}"` : null,
    `Detected category: ${category}`,
  ].filter(Boolean).join("\n");

  const liveSection = liveContext
    ? `\n\nLIVE WEB SEARCH RESULTS (fetched right now — use this as primary evidence):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${liveContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When referencing facts from the live search above, set the red flag basis to "live_data".
Prices, reviews, and issues from the live search supersede your training data estimates.`
    : "\n\n[No live web data available — analysis based on training knowledge only.]";

  const systemPrompt = `You are Lister the Detective — a product research AI.
RULES (never break):
- ALWAYS respond in ENGLISH ONLY.
- ALWAYS respond with raw JSON only — no markdown, no code blocks, no preamble.
- When you have live web search results, prioritize them over training knowledge.
- When uncertain about specifics not in the live data, say so honestly.
- NEVER hallucinate numbers or facts not supported by live data or training knowledge.`;

  const prompt = `You are Lister the Detective — AI product analyst for shoppers in ${countryContext}.

WHAT YOU ARE ANALYZING:
${productContext}
${liveSection}

CATEGORY GUIDANCE:
${categoryHints[category] ?? categoryHints.electronics}

IDENTIFICATION RULES:
- Prefer exact product titles, model numbers, seller names, and platform listing clues.
- If you can infer the product from ASIN, model, category, seller, or listing text, do so.
- Only return "Unknown" when there is truly no reliable evidence.
- If evidence is insufficient for a trustworthy conclusion, return a clear "under development" style answer instead of pretending certainty.
- If live search failed, explicitly say that web data was unavailable and keep the answer conservative.

ANALYSIS MISSION:
Use the live web search results (if available) as your primary source of truth for current prices, reviews, and issues.
Fill in gaps with your training knowledge about brand reputation, platform norms, and product category patterns.

HONESTY RULES:
1. Facts from live search: cite them confidently, set basis to "live_data"
2. Facts from training: distinguish clearly, set basis to "known_fact" or "pattern"
3. Logical deductions: set basis to "inference"
4. NEVER invent numbers not supported by either live data or solid training knowledge
  5. If live data is unavailable, set "liveDataUsed" to false and call that out in the disclaimer

Return ONLY raw JSON (English, no markdown):
{
  "productTitle": "Official product name",
  "brand": "Brand or 'Unknown Brand'",
  "platform": ${platformDetected ? `"${platformDetected}"` : "detected platform or null"},
  "estimatedPrice": "EGP range from live data if available, else training estimate or 'Verify price'",
  "overallTrustScore": <0-100 integer>,
  "verdict": "recommended|caution|avoid",
  "summary": "2-3 sentences covering what you found (live + training), key concern or strength, and buying guidance",
  "disclaimer": "Single sentence: what sources this analysis used (live web search + training knowledge) and what to verify",
  "liveDataUsed": ${liveContext ? "true" : "false"},
  "sellerAnalysis": "Platform norms + any live findings about this seller/product's current status",
  "specsAnalysis": "Spec check — flag anything unrealistic vs. price, use live data if specs were found",
  "reviewsAnalysis": "Review patterns from live data (if found) + category-level authenticity guidance",
  "brandTrustAnalysis": "Brand reputation from live data + training: origin, quality, warranty in ${countryContext}",
  "redFlags": [
    { "severity": "high|medium|low", "description": "Specific concern with evidence", "basis": "live_data|known_fact|pattern|inference" }
  ],
  "alternatives": [
    {
      "title": "Same product on this platform",
      "platform": "one of: ${platformsForAlts.join(", ")}",
      "url": null,
      "price": "From live data if found, else 'Varies'",
      "rating": null,
      "brand": "Same brand",
      "whyBetter": "Specific reason — platform advantage, price difference, or return policy",
      "trustScore": <0-100>
    }
  ]
}

Score: 75-100 = recommended, 45-74 = caution, 0-44 = avoid. Verdict must match score.
Provide 2-4 red flags. Provide 3-5 alternatives of the SAME product across: ${platformsForAlts.join(", ")}.`;

  // ── Phase 2: Main analysis with retry ────────────────────────────────────
  const MAX_RETRIES = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawContent = await withTimeout(callAI(prompt, systemPrompt), 45_000);
      const jsonStr = extractJson(rawContent);
      const parsed = JSON.parse(jsonStr) as AnalysisResult;

      if (typeof parsed.overallTrustScore !== "number") {
        throw new Error("Response missing required field: overallTrustScore");
      }

      // Enforce score ↔ verdict consistency
      if (parsed.overallTrustScore >= 75) parsed.verdict = "recommended";
      else if (parsed.overallTrustScore >= 45) parsed.verdict = "caution";
      else parsed.verdict = "avoid";

      // Ensure liveDataUsed is accurate
      parsed.liveDataUsed = !!liveContext;
      if (liveDataUnavailable && !parsed.disclaimer.toLowerCase().includes("web data")) {
        parsed.disclaimer = `${parsed.disclaimer} Web data was unavailable for this analysis.`;
      }

      // Generate search URLs for alternatives
      if (parsed.alternatives) {
        for (const alt of parsed.alternatives) {
          if (!alt.url) alt.url = generateSearchUrl(alt.platform, alt.title);
        }
      }

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("timed out")) break;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Analysis failed after retries");
}
