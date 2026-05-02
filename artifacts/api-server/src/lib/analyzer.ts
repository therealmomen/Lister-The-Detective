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
  sellerAnalysis: string;
  specsAnalysis: string;
  reviewsAnalysis: string;
  brandTrustAnalysis: string;
  redFlags: Array<{
    severity: "low" | "medium" | "high";
    description: string;
    basis: "known_fact" | "pattern" | "inference";
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
    return null;
  } catch { return null; }
}

function detectCategory(productName: string, query: string): string {
  const text = (productName + " " + query).toLowerCase();
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

/** Wrap a promise with a hard timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Analysis timed out after ${ms / 1000}s. Please try again.`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** Strip markdown fences and extract JSON from AI response */
function extractJson(raw: string): string {
  let s = raw.trim();
  // Remove markdown code fences
  s = s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  // Find first { and last }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return s.slice(start, end + 1);
  }
  return s;
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
  const extractedName = url ? extractProductNameFromUrl(url) : null;
  const category = detectCategory(extractedName ?? "", query ?? "");

  const categoryHints: Record<string, string> = {
    audio: "Pay special attention to ANC claims, driver size vs. price, codec support (aptX, LDAC), and brand warranty in Egypt. Sony, Bose, and Sennheiser have strong track records; generic brands at similar price points almost always underdeliver.",
    laptop: "Check thermal design claims vs. price, RAM/storage specs, CPU tier, and whether the brand has local service centers in Egypt. Cooling pads are a common generic market — quality control varies enormously.",
    smartphone: "Focus on IMEI status for Egypt, software update commitment, local warranty from official distributor vs. grey import, and processor benchmark vs. listed price.",
    wearable: "Check if health sensors are medically validated, GPS accuracy claims vs. price, and whether the companion app works in Egypt.",
    camera: "Verify sensor size claims, whether it's original brand vs. clone, and regional warranty coverage.",
    accessory: "Chargers and cables are a high-risk category — uncertified devices can damage other devices. Look for GCC/CE certification.",
    computer_peripheral: "Ergonomics and build quality vary widely; check switch type for keyboards, DPI accuracy for mice.",
    display: "Panel type (IPS vs. TN vs. VA), response time accuracy, and HDR certification legitimacy.",
    electronics: "Apply general rules: brand reputation, regional warranty, spec-to-price ratio.",
  };

  const productContext = [
    url ? `Product URL: ${url}` : null,
    platformDetected ? `Platform detected: ${platformDetected}` : null,
    extractedName ? `Product name from URL: "${extractedName}"` : null,
    !url && query ? `User search query: "${query}"` : null,
    `Detected category: ${category}`,
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are Lister the Detective — a product research AI that ONLY states things it actually knows from training data.
RULES (never break these):
- NEVER hallucinate specific numbers, ratings, or listing details you cannot verify from training knowledge.
- ALWAYS respond in ENGLISH ONLY — never Arabic or any other language, regardless of product origin or region.
- ALWAYS respond with raw JSON only — no markdown, no code blocks, no preamble, no explanation outside the JSON.
- When uncertain about something specific, express that uncertainty honestly ("not confirmed in training data", "verify before purchasing") rather than inventing a number.`;

  const prompt = `You are Lister the Detective — an AI product research analyst for shoppers in ${countryContext}.

WHAT YOU ARE ANALYZING:
${productContext}

CATEGORY GUIDANCE FOR THIS ANALYSIS:
${categoryHints[category] ?? categoryHints.electronics}

YOUR KNOWLEDGE MODEL:
You cannot browse URLs or access live data. You work from training knowledge about:
- Brand histories, reputations, and documented quality patterns
- Typical seller behavior and platform norms (Amazon EG, Noon, eBay, Alibaba)
- Product category quality benchmarks and common failure modes
- Egyptian market pricing, warranty realities, and import patterns
- Known model numbers, their real-world track records, and documented issues

HONESTY RULES (NON-NEGOTIABLE):
1. NEVER invent specific numbers (seller ratings, review counts, exact prices). Use ranges or "verify on platform."
2. NEVER say you "checked the seller" or "viewed the listing" — you have not.
3. Unknown brands = explicitly flag them as unknown and explain the risk.
4. Every red flag must declare its basis: known_fact / pattern / inference.
5. Trust scores reflect actual knowledge only. Unknown brand in risky category = 20–40. Well-documented flagship = 70–90.
6. Price: use Egyptian market ranges from training data, or "Verify price — not reliably in training data."

ANALYSIS MISSION:
Part 1 — Analyze the product: seller norms, spec reality, review trustworthiness, brand reputation.
Part 2 — Find the SAME product on other platforms (not alternatives — the same item from a better or different source). If unsure about availability, say so in whyBetter.

Return ONLY raw JSON, English only, no markdown:
{
  "productTitle": "Official product name based on URL/query",
  "brand": "Brand name or 'Unknown Brand'",
  "platform": ${platformDetected ? `"${platformDetected}"` : "detected platform or null"},
  "estimatedPrice": "EGP range or 'Verify price — not in training data'",
  "overallTrustScore": <0-100 integer, strictly knowledge-based>,
  "verdict": "recommended|caution|avoid",
  "summary": "2-3 honest English sentences covering: what you know, the key concern or strength, and buying guidance",
  "disclaimer": "Single sentence: what this analysis is based on and what the user must verify directly on the platform",
  "sellerAnalysis": "Platform norms for this product type, return/refund policies, what to verify about the actual seller",
  "specsAnalysis": "Are specs consistent with a real known product? Any red flags in the spec sheet relative to price tier?",
  "reviewsAnalysis": "Review authenticity patterns for this brand/category. What should the buyer look for?",
  "brandTrustAnalysis": "Everything known about this brand: origin, quality track record, warranty in ${countryContext}, distributor presence",
  "redFlags": [
    { "severity": "high|medium|low", "description": "Specific grounded concern", "basis": "known_fact|pattern|inference" }
  ],
  "alternatives": [
    {
      "title": "Same product on this platform",
      "platform": "one of: ${platformsForAlts.join(", ")}",
      "url": null,
      "price": "EGP estimate or 'Varies'",
      "rating": null,
      "brand": "Same brand",
      "whyBetter": "Why this platform/seller is a better buy for this specific product",
      "trustScore": <0-100>
    }
  ]
}

Score thresholds: 75-100 = recommended, 45-74 = caution, 0-44 = avoid. Verdict must match score.
Provide 2-4 specific red flags. Provide 3-5 alternatives of the SAME product across: ${platformsForAlts.join(", ")}.`;

  // Attempt with up to 2 retries on JSON parse failure
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

      // Generate search URLs for all alternatives
      if (parsed.alternatives) {
        for (const alt of parsed.alternatives) {
          if (!alt.url) alt.url = generateSearchUrl(alt.platform, alt.title);
        }
      }

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry timeouts — they are definitive
      if (lastError.message.includes("timed out")) break;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Analysis failed after retries");
}
