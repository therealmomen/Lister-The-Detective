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

function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("amazon.") || lower.includes("amzn.")) return "amazon";
  if (lower.includes("ebay.")) return "ebay";
  if (lower.includes("noon.")) return "noon";
  if (lower.includes("alibaba.")) return "alibaba";
  if (lower.includes("aliexpress.")) return "aliexpress";
  return null;
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
  const platformDetected = url ? detectPlatform(url) : null;
  const platformsForAlts = platforms.length > 0 ? platforms : ["amazon", "ebay"];
  const countryContext = country === "EG" ? "Egypt" : (country || "international");

  const isShortUrl = url && (url.includes("amzn.eu") || url.includes("amzn.to") || url.includes("amzn.com/d"));

  const productContext = url
    ? `Product URL: ${url}${platformDetected ? ` (${platformDetected} listing)` : ""}${isShortUrl ? " — this is a shortened Amazon URL. Identify the product based on the URL structure and use your general knowledge to analyze Amazon listings of this type." : ""}`
    : `Product search query: "${query}"`;

  const prompt = `You are Lister, an expert AI product research analyst. A shopper from ${countryContext} needs help evaluating a product listing before purchasing.

${productContext}

Your task has TWO parts:
PART 1 — Analyze the product listing at the URL (or described by the search query). Assess seller trust, specs honesty, review authenticity, and brand reputation.

PART 2 — Find the EXACT SAME product listed on other platforms or from different/better sellers. The user wants to buy THIS specific product but smarter — from a more trustworthy seller or at a better price. Do NOT suggest different products. If the product is a Sony WH-1000XM5, suggest Sony WH-1000XM5 on Amazon, on Noon, on eBay, etc. — not Bose or Sennheiser alternatives.

Return a JSON object with EXACTLY this structure:
{
  "productTitle": "Full product name as it would appear on listings",
  "brand": "Brand name",
  "platform": ${platformDetected ? `"${platformDetected}"` : "detected platform name or null"},
  "estimatedPrice": "realistic price range in EGP (Egyptian Pounds) if country is Egypt, otherwise in USD",
  "overallTrustScore": <integer 0-100>,
  "verdict": "recommended" | "caution" | "avoid",
  "summary": "2-3 sentence executive summary of the listing analysis and whether the user should buy here or look elsewhere",
  "sellerAnalysis": "Detailed analysis of seller trustworthiness on this platform — typical practices, fulfillment reliability, return/refund policies, and red flags specific to this type of seller",
  "specsAnalysis": "Are the claimed specs realistic for this price point? What specs matter most for this product category and how does this listing measure up?",
  "reviewsAnalysis": "Are reviews for this product/seller typically genuine? Common verified-buyer praise and complaints. Signs of review manipulation if any.",
  "brandTrustAnalysis": "Brand origin, global and local reputation in ${countryContext}, warranty and after-sales support availability, how trustworthy it is for local buyers",
  "redFlags": [
    { "severity": "high" | "medium" | "low", "description": "specific, concrete red flag — not generic advice" }
  ],
  "alternatives": [
    {
      "title": "EXACT SAME product name — e.g. Sony WH-1000XM6 Wireless Headphones",
      "platform": "one of: ${platformsForAlts.join(", ")}",
      "url": null,
      "price": "estimated price on this platform in EGP or USD",
      "rating": <average seller/product rating as number, e.g. 4.5, or null>,
      "brand": "same brand as the analyzed product",
      "whyBetter": "Why buying this SAME product from THIS platform/seller is a better choice — mention price difference, seller rating, return policy, official distributor status, faster shipping, warranty support, etc.",
      "trustScore": <integer 0-100 reflecting how trustworthy this specific listing/seller is>
    }
  ]
}

Rules:
- overallTrustScore: 70-100 = recommended, 40-69 = caution, 0-39 = avoid. Verdict must match score.
- Include 2-4 specific red flags for THIS listing (not generic category warnings)
- Provide 3-5 alternatives of the EXACT SAME product across different platforms: ${platformsForAlts.join(", ")}
- Each alternative must be the same product, just on a different platform or from a better seller
- whyBetter must explain why THIS platform/seller is better for THIS product specifically (price, official status, warranty, return policy, etc.)
- Price must be in EGP for Egyptian context — typical range, not a fixed price
- ONLY return valid JSON, no markdown, no explanation outside the JSON`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: "You are a product research expert specializing in Egyptian e-commerce. Always respond with valid JSON only — no markdown formatting, no code blocks, just raw JSON.",
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
  // Strip markdown code fences if AI wraps in them despite instructions
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

  // Generate search URLs for alternatives that don't have real URLs
  if (parsed.alternatives) {
    for (const alt of parsed.alternatives) {
      if (!alt.url) {
        alt.url = generateSearchUrl(alt.platform, alt.title);
      }
    }
  }

  return parsed;
}
