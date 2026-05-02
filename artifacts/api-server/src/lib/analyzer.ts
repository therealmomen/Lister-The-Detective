import { openai } from "@workspace/integrations-openai-ai-server";

export interface AnalysisResult {
  productTitle: string;
  brand: string;
  platform: string | null;
  estimatedPrice: string | null;
  overallTrustScore: number;
  verdict: "recommended" | "caution" | "avoid";
  summary: string;
  sellerAnalysis: string;
  specsAnalysis: string;
  reviewsAnalysis: string;
  brandTrustAnalysis: string;
  redFlags: Array<{
    severity: "low" | "medium" | "high";
    description: string;
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

const SHORT_URL_PATTERNS = [
  "amzn.eu",
  "amzn.to",
  "amzn.com/d",
  "a.co/",
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "t.co",
  "ow.ly",
  "rb.gy",
];

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

/**
 * Try to extract a human-readable product name from a full e-commerce URL.
 * e.g. amazon.eg/.../Crash-C3000-Laptop-Cooling-Fan/dp/B0GJLR7TDK → "Crash C3000 Laptop Cooling Fan"
 */
function extractProductNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);

    // Amazon pattern: .../[slug]/dp/[ASIN]
    const dpIndex = segments.findIndex((s) => s === "dp");
    if (dpIndex > 0) {
      const slug = segments[dpIndex - 1];
      if (slug && slug.length > 3 && !slug.startsWith("B0")) {
        return slug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
      }
    }

    // eBay pattern: .../itm/[slug]/[id]
    const itmIndex = segments.findIndex((s) => s === "itm");
    if (itmIndex >= 0 && segments[itmIndex + 1]) {
      const slug = segments[itmIndex + 1];
      if (slug && !slug.match(/^\d+$/)) {
        return slug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
      }
    }

    return null;
  } catch {
    return null;
  }
}

function generateSearchUrl(platform: string, productTitle: string): string {
  const query = encodeURIComponent(productTitle);
  switch (platform.toLowerCase()) {
    case "amazon":
      return `https://www.amazon.eg/s?k=${query}`;
    case "noon":
      return `https://www.noon.com/egypt-en/search/?q=${query}`;
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    case "alibaba":
      return `https://www.alibaba.com/trade/search?SearchText=${query}`;
    case "aliexpress":
      return `https://www.aliexpress.com/wholesale?SearchText=${query}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(productTitle + " " + platform)}`;
  }
}

export async function analyzeProduct(
  url: string | null | undefined,
  query: string | null | undefined,
  platforms: string[],
  country: string | null | undefined
): Promise<AnalysisResult> {
  // Short URLs must be rejected before reaching this function — but guard here too
  if (url && isShortUrl(url)) {
    throw new Error(
      "Short links cannot be analyzed. Please open the product page in your browser, copy the full URL from the address bar, and paste that instead."
    );
  }

  const platformDetected = url ? detectPlatform(url) : null;
  const platformsForAlts = platforms.length > 0 ? platforms : ["amazon", "ebay"];
  const countryContext = country === "EG" ? "Egypt" : country || "international";

  // Extract product name from URL slug to give AI more context
  const extractedName = url ? extractProductNameFromUrl(url) : null;

  const productContext = url
    ? [
        `Product URL: ${url}`,
        platformDetected ? `Platform: ${platformDetected}` : "",
        extractedName ? `Product name extracted from URL: "${extractedName}"` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : `Product search query: "${query}"`;

  const prompt = `You are Lister, an expert AI product research analyst for shoppers in ${countryContext}. Analyze the following product and return a full report in ENGLISH ONLY.

${productContext}

TASK:
1. Analyze this specific product listing — assess seller trustworthiness, spec accuracy, review authenticity, and brand reputation.
2. Find the EXACT SAME product on other platforms so the user can compare where to buy it from the most trustworthy source. Do NOT suggest different products — only the same product from different platforms or sellers.

CRITICAL RULES — MUST FOLLOW:
- Your ENTIRE response must be in ENGLISH. No Arabic, no other language. English only.
- Return ONLY raw JSON — no markdown, no code fences, no explanation. Just the JSON object.
- All text fields (summary, analyses, red flag descriptions, whyBetter) must be in English.
- Prices must be in EGP (Egyptian Pounds) for ${countryContext === "Egypt" ? "Egypt" : countryContext}.

Return this exact JSON structure:
{
  "productTitle": "Full English product name",
  "brand": "Brand name",
  "platform": ${platformDetected ? `"${platformDetected}"` : "detected platform name or null"},
  "estimatedPrice": "price range in EGP e.g. EGP 2,500-3,200",
  "overallTrustScore": <integer 0-100>,
  "verdict": "recommended" | "caution" | "avoid",
  "summary": "2-3 English sentences summarizing the analysis",
  "sellerAnalysis": "English analysis of seller trustworthiness, return policy, and red flags",
  "specsAnalysis": "English analysis of whether specs are realistic for this price and category",
  "reviewsAnalysis": "English analysis of review authenticity and common buyer feedback",
  "brandTrustAnalysis": "English analysis of brand reputation, warranty, and local support in ${countryContext}",
  "redFlags": [
    { "severity": "high" | "medium" | "low", "description": "Specific English red flag description" }
  ],
  "alternatives": [
    {
      "title": "Exact same product name in English",
      "platform": "one of: ${platformsForAlts.join(", ")}",
      "url": null,
      "price": "estimated price in EGP on this platform",
      "rating": <number like 4.5 or null>,
      "brand": "Same brand as the analyzed product",
      "whyBetter": "English explanation of why buying from this platform/seller is better — price, seller rating, official distributor, return policy, warranty, etc.",
      "trustScore": <integer 0-100>
    }
  ]
}

Score rules: 70-100 = recommended, 40-69 = caution, 0-39 = avoid. Verdict must match the score.
Provide 2-4 specific red flags and 3-5 alternatives of the SAME product across: ${platformsForAlts.join(", ")}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content:
          "You are a product research expert. You ALWAYS respond in ENGLISH ONLY — never Arabic, never any other language regardless of the product's region or origin. You always respond with raw JSON only, no markdown, no code blocks.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  const parsed = JSON.parse(jsonStr) as AnalysisResult;

  if (typeof parsed.overallTrustScore !== "number") {
    throw new Error("Invalid analysis result structure");
  }

  if (parsed.overallTrustScore >= 70) {
    parsed.verdict = "recommended";
  } else if (parsed.overallTrustScore >= 40) {
    parsed.verdict = "caution";
  } else {
    parsed.verdict = "avoid";
  }

  // Generate real search URLs for all alternatives
  if (parsed.alternatives) {
    for (const alt of parsed.alternatives) {
      if (!alt.url) {
        alt.url = generateSearchUrl(alt.platform, alt.title);
      }
    }
  }

  return parsed;
}
