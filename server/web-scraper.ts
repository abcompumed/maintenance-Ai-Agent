import { gotScraping } from "got-scraping";
import { load as cheerioLoad } from "cheerio";
import { getDb } from "./db";
import { searchSources, faults } from "../drizzle/schema"; // أضفنا faults للتعلم
import { eq } from "drizzle-orm";

/**
 * Professional Medical Web Scraper (Enhanced for Authenticated Forums)
 */

export interface ScrapedContent {
  title: string;
  url: string;
  content: string;
  relevanceScore: number;
}

/**
 * Scrape with Authentication Support
 * سنستخدم هذا الجزء لتمكين الدخول بحساباتك لاحقاً
 */
async function fetchWithAuth(url: string, credentials?: any) {
  const options: any = {
    timeout: { request: 15000 },
    headerGeneratorOptions: {
      browsers: [{ name: "chrome" }],
      devices: ["desktop"],
      locales: ["en-US"],
    },
  };

  // إذا وجدنا حساباً لهذا الدومين، سنقوم بحقن الـ Cookies أو Headers
  if (credentials) {
    // سيتم إضافة كود حقن الحسابات هنا بناءً على نوع المنتدى
    // options.headers = { 'Cookie': credentials.cookie };
  }

  return await gotScraping.get(url, options);
}

/**
 * Global Search & Technical Extraction
 */
export async function scrapeUrl(url: string, searchQuery: string): Promise<ScrapedContent | null> {
  try {
    const response = await fetchWithAuth(url);
    const $ = cheerioLoad(response.body);

    const title = $("h1").first().text() || $("title").text() || "Technical Document";
    
    // تركيز البحث على الأجزاء التقنية فقط
    let content = $("article, main, .post-content, .entry-content, #manual-content").text();
    if (!content) content = $("body").text();

    content = content.replace(/\s+/g, " ").substring(0, 8000).trim();

    // حساب درجة الملاءمة بناءً على المصطلحات التقنية الإنجليزية
    const queryWords = searchQuery.toLowerCase().split(" ");
    const matchCount = queryWords.filter(word => content.toLowerCase().includes(word)).length;
    const relevanceScore = matchCount / queryWords.length;

    return { title, url, content, relevanceScore };
  } catch (error) {
    return null;
  }
}

/**
 * Learning Mechanism: حفظ العطل المكتشف من النت في قاعدة البيانات
 */
async function saveToKnowledgeBase(content: ScrapedContent, query: string) {
  const db = await getDb();
  if (!db) return;

  const info = extractMaintenanceInfo(content.content);
  if (info.procedures.length > 0) {
    try {
      await db.insert(faults).values({
        faultDescription: `Web Found: ${query}`,
        solution: info.procedures.join("\n"),
        partsRequired: info.parts.join(", "),
        deviceType: "Analyzed from Web",
        manufacturer: "Extracted Source",
        deviceModel: content.title.substring(0, 50),
        rootCause: "Information gathered from technical forums"
      });
    } catch (e) {
      // تجنب التكرار
    }
  }
}

/**
 * Enhanced Maintenance Info Extractor (Technical English)
 */
export function extractMaintenanceInfo(content: string) {
  const parts: string[] = [];
  const procedures: string[] = [];
  const warnings: string[] = [];

  const lines = content.split(/[.!?\n]/); // تقسيم أدق للجمل

  for (const line of lines) {
    const l = line.toLowerCase();
    
    // التقاط أرقام القطع والرموز التقنية
    if (l.includes("part #") || l.includes("ref:") || l.includes("p/n")) {
      const part = line.match(/[A-Z0-9-]{4,}/);
      if (part) parts.push(part[0]);
    }

    // التقاط خطوات الإصلاح (English Keywords)
    if (/(replace|calibrate|unscrew|check voltage|solder|remove)/i.test(l)) {
      procedures.push(line.trim());
    }

    // التقاط التحذيرات الطبية والهندسية
    if (/(warning|caution|danger|high voltage|hazard)/i.test(l)) {
      warnings.push(line.trim());
    }
  }

  return { 
    parts: [...new Set(parts)].slice(0, 10), 
    procedures: [...new Set(procedures)].slice(0, 15), 
    warnings: [...new Set(warnings)].slice(0, 5) 
  };
}

// الدوال الأخرى (searchAllSources, addSearchSource) تظل كما هي مع استخدام scrapeUrl المطور
