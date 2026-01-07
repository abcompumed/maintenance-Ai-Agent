import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { faults, queryHistory, documents } from "../drizzle/schema";
import { eq, like, desc, or } from "drizzle-orm";

// تعريف إيميلك كمدير خارق لتجاوز أي قيود في التحليل
const SUPER_ADMIN_EMAIL = "didofido812@gmail.com";

/**
 * Build System Prompt: The "Brain" of your Medical Engineering Assistant
 */
function buildSystemPrompt(): string {
  return `You are a Senior Biomedical Service Engineer with 20+ years of experience. 
Your expertise covers: Ventilators, Imaging (Ultrasound/CT/MRI), Dialysis, and Patient Monitors.

CORE RULES:
1. TECHNICAL LANGUAGE: Use strictly professional English for all technical terms, spare parts, and diagnostic procedures.
2. VISUAL ANALYSIS: You are expert at interpreting circuit boards (PCBs), error codes on LCDs, and schematics.
3. DIAGNOSIS: Provide root cause analysis based on the specific service manual of the device.
4. SAFETY: Always prioritize electrical safety and patient safety (Leakage current, Calibration).
5. NO ARABIC: Do not use Arabic for maintenance terms or repair steps.

When analyzing:
- Look for component-level failures (Capacitors, MOSFETs, Sensors).
- Provide precise error code definitions (e.g., "Error E01 on GE Carescape means...").
- Reference specific chapters from the provided documents.`;
}

/**
 * Enhanced Analysis Function
 */
export async function analyzeFault(
  request: any,
  userId: number,
  userEmail?: string // أضفنا الإيميل للتحقق
): Promise<any> {
  try {
    const db = await getDb();
    const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;

    // 1. استخراج سياق الملفات المرفوعة (Documents Context)
    // قمنا بزيادة عدد الحروف المستخرجة لضمان قراءة أفضل للكتالوجات
    let documentContext = "";
    if (request.uploadedDocumentIds?.length > 0) {
      const docs = await db.select().from(documents);
      const relevantDocs = docs.filter(d => request.uploadedDocumentIds.includes(d.id));
      documentContext = relevantDocs.map(d => 
        `[Source: ${d.fileName}]\n${d.extractedText?.substring(0, 5000)}`
      ).join("\n\n");
    }

    // 2. بناء الطلب الموجه للذكاء الاصطناعي
    const analysisPrompt = `
EXPERT ANALYSIS REQUEST:
Device: ${request.manufacturer} ${request.deviceModel} (${request.deviceType})
Fault: ${request.faultDescription}
Symptoms: ${request.symptoms || "N/A"}
Error Codes: ${request.errorCodes || "N/A"}

REFERENCE DATA:
${documentContext || "No manuals attached. Use your internal engineering database."}

REQUIRED JSON OUTPUT:
{
  "rootCause": "Deep technical cause",
  "solution": "Step-by-step repair guide",
  "partsRequired": ["Exact part names/numbers"],
  "estimatedRepairTime": "Time in hours",
  "difficulty": "expert",
  "references": ["Manual pages or technical sources"]
}`;

    // 3. استدعاء Gemini (LLM)
    const response = await invokeLLM({
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: analysisPrompt },
      ],
      response_format: { type: "json_object" } // نطلب منه JSON دائماً
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      ...result,
      relatedFaults: [] // سنقوم بربطها لاحقاً بقاعدة البيانات
    };
  } catch (error) {
    console.error("Analysis Failed:", error);
    throw new Error("Engineering Analysis Failed");
  }
}

// باقي الوظائف (saveFaultAnalysis, logQuery) تبقى كما هي لدعم قاعدة البيانات
