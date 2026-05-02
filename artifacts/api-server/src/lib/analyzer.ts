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
  if (url.includes("amazon.")) return "amazon";
  if (url.includes("ebay.")) return "ebay";
  if (url.includes("noon.")) return "noon";
  if (url.includes("alibaba.")) return "alibaba";
  if (url.includes("aliexpress.")) return "aliexpress";
  return null;
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

  const productContext = url
    ? `Product URL: ${url}${platformDetected ? ` (${platformDetected} listing)` : ""}`
    : `Product search query: "${query}"`;

  const prompt = `You are Lister, an expert AI product research analyst. A shopper from ${countryContext} needs help evaluating a product before purchasing.

${productContext}

Perform a comprehensive background check on this product listing. Consider:
- Brand reputation and trustworthiness (especially for generic/Chinese brands)
- Typical seller practices on this platform
- Expected build quality based on specs and price range
- Common complaints and red flags for this product category
- What makes a genuinely trustworthy option in this category

Return a JSON object with EXACTLY this structure:
{
  "productTitle": "Full product name",
  "brand": "Brand name",
  "platform": ${platformDetected ? `"${platformDetected}"` : "null or detected platform"},
  "estimatedPrice": "price range in USD or local currency if known",
  "overallTrustScore": <integer 0-100>,
  "verdict": "recommended" | "caution" | "avoid",
  "summary": "2-3 sentence executive summary of the analysis and buying recommendation",
  "sellerAnalysis": "Detailed analysis of seller trustworthiness on this platform, typical practices, refund policies, and red flags for this type of seller",
  "specsAnalysis": "Analysis of the product specifications — are they realistic? Are claimed specs typical for this price point? What specs matter most and what to look for?",
  "reviewsAnalysis": "Analysis of typical review patterns for this type of product/brand — are reviews usually genuine? What do verified buyers usually say? Common praise and complaints?",
  "brandTrustAnalysis": "Deep analysis of the brand — its origin, reputation in the market, warranty support, how it compares to established brands, and whether it's trustworthy for buyers in ${countryContext}",
  "redFlags": [
    { "severity": "high" | "medium" | "low", "description": "specific red flag description" }
  ],
  "alternatives": [
    {
      "title": "Alternative Product Name",
      "platform": "${platformsForAlts[0] || "amazon"}",
      "url": null,
      "price": "estimated price",
      "rating": <number or null>,
      "brand": "Brand name",
      "whyBetter": "Clear, specific explanation of why this is a better choice — mention concrete advantages",
      "trustScore": <integer 0-100>
    }
  ]
}

Rules:
- overallTrustScore: 70-100 = recommended, 40-69 = caution, 0-39 = avoid. Match verdict to score.
- Include 2-5 red flags (at minimum mention generic brand risk if applicable)
- Provide 3-5 alternatives that are genuinely better options, spread across: ${platformsForAlts.join(", ")}
- Each alternative should have a distinct brand/product positioning (budget pick, best value, premium option)
- whyBetter must be specific and factual — mention actual advantages (warranty, brand reputation, specs, etc.)
- Be especially attentive to generic/unbranded products that pose quality risks for buyers in ${countryContext}
- ONLY return valid JSON, no markdown, no explanation outside the JSON`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: "You are a product research expert. Always respond with valid JSON only — no markdown formatting, no code blocks, just raw JSON.",
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

  const parsed = JSON.parse(content.trim()) as AnalysisResult;

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

  return parsed;
}
