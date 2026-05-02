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
  } catch {
    return null;
  }
}

function generateSearchUrl(platform: string, productTitle: string): string {
  const query = encodeURIComponent(productTitle);
  switch (platform.toLowerCase()) {
    case "amazon":    return `https://www.amazon.eg/s?k=${query}`;
    case "noon":      return `https://www.noon.com/egypt-en/search/?q=${query}`;
    case "ebay":      return `https://www.ebay.com/sch/i.html?_nkw=${query}`;
    case "alibaba":   return `https://www.alibaba.com/trade/search?SearchText=${query}`;
    case "aliexpress":return `https://www.aliexpress.com/wholesale?SearchText=${query}`;
    default:          return `https://www.google.com/search?q=${encodeURIComponent(productTitle + " " + platform)}`;
  }
}

export async function analyzeProduct(
  url: string | null | undefined,
  query: string | null | undefined,
  platforms: string[],
  country: string | null | undefined
): Promise<AnalysisResult> {
  if (url && isShortUrl(url)) {
    throw new Error(
      "Short links cannot be analyzed. Please open the product in your browser and copy the full URL from the address bar."
    );
  }

  const platformDetected = url ? detectPlatform(url) : null;
  const platformsForAlts = platforms.length > 0 ? platforms : ["amazon", "ebay"];
  const countryContext = country === "EG" ? "Egypt" : country || "international";
  const extractedName = url ? extractProductNameFromUrl(url) : null;

  const productContext = [
    url ? `Product URL: ${url}` : null,
    platformDetected ? `Platform detected: ${platformDetected}` : null,
    extractedName ? `Product name from URL path: "${extractedName}"` : null,
    !url && query ? `User search query: "${query}"` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are Lister the Detective — an AI product research analyst for shoppers in ${countryContext}.

WHAT YOU ARE ANALYZING:
${productContext}

YOUR KNOWLEDGE MODEL — READ CAREFULLY:
You cannot browse the internet or visit URLs. You work entirely from your training knowledge about:
- Brand histories, reputations, and known quality patterns
- Typical seller behavior and platform norms on Amazon, Noon, eBay, and Alibaba
- Common product category quality issues (e.g. generic cooling pads, wireless earbuds, etc.)
- Price ranges and value expectations in Egypt and the Middle East
- Known product lines, model numbers, and their real-world performance track record

HONESTY RULES — NON-NEGOTIABLE:
1. NEVER invent specific numbers you do not know (exact seller ratings, precise review counts, specific listing prices). Use ranges or "unknown" instead.
2. NEVER claim to have "seen the listing" or "checked the seller" — you have not. You analyze what you know about the brand, product category, and platform patterns.
3. If you do not recognize a brand or product, say so clearly and explain what that means (unknown brands carry higher risk).
4. Every red flag must state its basis: is it a KNOWN FACT (documented product/brand issue), a PATTERN (typical behavior for this category/platform), or an INFERENCE (logical reasoning from available info)?
5. Trust scores must reflect actual knowledge, not guesses. Unknown brands should score lower. Well-documented brands score higher.
6. Price estimates should reflect real Egyptian market ranges you have knowledge of, or state "Market price unknown — verify before purchasing."

ANALYSIS FRAMEWORK:
- Seller analysis: What do you know about how this platform handles this type of seller/product? What are the platform's own policies for this category?
- Specs analysis: Are the specs consistent with what's technically possible at this price tier? Does the model number match a known real product?
- Reviews analysis: Based on this brand's history, are reviews typically trustworthy? What patterns does this product category show?
- Brand trust: Do you have actual knowledge of this brand's reputation, manufacturing quality, warranty practices, and Egyptian market presence?

ALTERNATIVES MISSION:
Find the EXACT SAME product on other platforms (not a different product — the same one). If you don't know the product well enough to confirm availability on a specific platform, say "Check availability" in whyBetter rather than making up a listing.

Return ONLY this exact JSON structure. English only. No markdown. No code fences:
{
  "productTitle": "Official product name as sold (based on URL/query info)",
  "brand": "Brand name, or 'Unknown Brand' if not recognized",
  "platform": ${platformDetected ? `"${platformDetected}"` : "detected platform or null"},
  "estimatedPrice": "EGP range based on market knowledge, or 'Verify price — not in training data'",
  "overallTrustScore": <integer 0-100 based strictly on what you know>,
  "verdict": "recommended" | "caution" | "avoid",
  "summary": "2-3 honest sentences: what you know about this product/brand, key concern or confidence, and buying recommendation",
  "disclaimer": "One sentence explaining what this analysis is based on (your training knowledge) and what the user should verify themselves",
  "sellerAnalysis": "What you know about how ${platformDetected || "this platform"} handles this product category — policies, typical seller behavior, return/refund norms. Be honest about what you don't know about THIS specific seller.",
  "specsAnalysis": "Are these specs consistent with a real, known product? What does the model number tell you? Flag spec claims that are unrealistic for the price tier.",
  "reviewsAnalysis": "Based on what you know about this brand and product category, are reviews in this space typically trustworthy? What should the buyer look for or be cautious of?",
  "brandTrustAnalysis": "Everything you actually know about this brand: origin, manufacturing reputation, warranty practices, market presence in ${countryContext}. If brand is unknown, explain the implications.",
  "redFlags": [
    {
      "severity": "high" | "medium" | "low",
      "description": "Specific, grounded flag — cite why this is a concern",
      "basis": "known_fact" | "pattern" | "inference"
    }
  ],
  "alternatives": [
    {
      "title": "Same product name on this platform",
      "platform": "one of: ${platformsForAlts.join(", ")}",
      "url": null,
      "price": "EGP estimate or 'Varies — check platform'",
      "rating": null,
      "brand": "Same brand",
      "whyBetter": "Specific reason based on what you know about this platform's handling of this product — price advantage, official distributor status, return policy, warranty support",
      "trustScore": <integer 0-100>
    }
  ]
}

Score guide: 75-100 = recommended (solid track record, trustworthy brand, platform suits it), 45-74 = caution (some concerns, proceed carefully), 0-44 = avoid (significant known issues or too many unknowns for the risk level).
Provide 2-4 red flags with their basis clearly stated. Provide 3-5 alternatives of the SAME product across: ${platformsForAlts.join(", ")}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are Lister the Detective — a product research AI that ONLY states things it actually knows from training data. 
You NEVER hallucinate specific numbers, ratings, or listing details you cannot verify.
You ALWAYS respond in ENGLISH ONLY — never Arabic or any other language.
You ALWAYS respond with raw JSON only — no markdown, no code blocks, no preamble.
When uncertain, you express that uncertainty honestly rather than making something up.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  const parsed = JSON.parse(jsonStr) as AnalysisResult;

  if (typeof parsed.overallTrustScore !== "number") {
    throw new Error("Invalid analysis result structure");
  }

  // Enforce score ↔ verdict consistency
  if (parsed.overallTrustScore >= 75) {
    parsed.verdict = "recommended";
  } else if (parsed.overallTrustScore >= 45) {
    parsed.verdict = "caution";
  } else {
    parsed.verdict = "avoid";
  }

  // Generate real search URLs for alternatives
  if (parsed.alternatives) {
    for (const alt of parsed.alternatives) {
      if (!alt.url) {
        alt.url = generateSearchUrl(alt.platform, alt.title);
      }
    }
  }

  return parsed;
}
