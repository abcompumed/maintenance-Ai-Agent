import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { faults, queryHistory, documents } from "../drizzle/schema";
import { eq, like, desc } from "drizzle-orm";

/**
 * AI Agent for medical device maintenance analysis
 * Uses LLM to analyze faults, documents, and provide solutions
 */

export interface FaultAnalysisRequest {
  deviceType: string;
  manufacturer: string;
  deviceModel: string;
  faultDescription: string;
  symptoms?: string;
  errorCodes?: string;
  uploadedDocumentIds?: number[];
}

export interface FaultAnalysisResponse {
  rootCause: string;
  solution: string;
  partsRequired: string[];
  estimatedRepairTime: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  relatedFaults: Array<{
    id: number;
    description: string;
    similarity: number;
  }>;
  references: string[];
}

/**
 * Build system prompt for the AI agent
 */
function buildSystemPrompt(): string {
  return `You are an expert biomedical engineering maintenance assistant. Your role is to:

1. Analyze medical device faults and provide accurate diagnostic information
2. Identify root causes of device failures
3. Recommend repair solutions and procedures
4. Identify required spare parts and tools
5. Estimate repair difficulty and time
6. Reference relevant maintenance documents and technical specifications

When analyzing faults:
- Consider the device type, manufacturer, and model
- Review provided symptoms and error codes
- Reference uploaded maintenance documents if available
- Provide step-by-step repair procedures
- Identify safety considerations
- Suggest preventive maintenance measures

Always:
- Be precise and technical in your language
- Cite sources when referencing specific procedures
- Warn about potential hazards
- Recommend professional service when necessary
- Maintain compliance with medical device regulations`;
}

/**
 * Search for similar faults in the knowledge base
 */
async function findSimilarFaults(
  request: FaultAnalysisRequest,
  limit: number = 5
): Promise<Array<{ id: number; description: string; solution: string }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    const similarFaults = await db
      .select()
      .from(faults)
      .where(
        like(
          faults.faultDescription,
          `%${request.faultDescription.split(" ").slice(0, 3).join("%")}%`
        )
      )
      .orderBy(desc(faults.views))
      .limit(limit);

    return similarFaults.map((f) => ({
      id: f.id,
      description: f.faultDescription,
      solution: f.solution || "",
    }));
  } catch (error) {
    console.error("Error finding similar faults:", error);
    return [];
  }
}

/**
 * Retrieve document context for analysis
 */
async function getDocumentContext(
  documentIds: number[],
  userId: number
): Promise<string> {
  const db = await getDb();
  if (!db || documentIds.length === 0) return "";

  try {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const relevantDocs = docs.filter((d) => documentIds.includes(d.id));

    return relevantDocs
      .map(
        (d) =>
          `[Document: ${d.fileName}]\n${d.extractedText?.substring(0, 2000) || ""}`
      )
      .join("\n\n");
  } catch (error) {
    console.error("Error retrieving document context:", error);
    return "";
  }
}

/**
 * Main fault analysis function
 */
export async function analyzeFault(
  request: FaultAnalysisRequest,
  userId: number
): Promise<FaultAnalysisResponse> {
  try {
    // Get similar faults from knowledge base
    const similarFaults = await findSimilarFaults(request);

    // Get document context if provided
    let documentContext = "";
    if (request.uploadedDocumentIds && request.uploadedDocumentIds.length > 0) {
      documentContext = await getDocumentContext(
        request.uploadedDocumentIds,
        userId
      );
    }

    // Build the analysis prompt
    const analysisPrompt = `
Analyze the following medical device fault and provide comprehensive maintenance guidance:

**Device Information:**
- Type: ${request.deviceType}
- Manufacturer: ${request.manufacturer}
- Model: ${request.deviceModel}

**Fault Details:**
- Description: ${request.faultDescription}
${request.symptoms ? `- Symptoms: ${request.symptoms}` : ""}
${request.errorCodes ? `- Error Codes: ${request.errorCodes}` : ""}

${documentContext ? `**Relevant Documentation:**\n${documentContext}\n` : ""}

${similarFaults.length > 0 ? `**Similar Previously Solved Faults:**\n${similarFaults.map((f) => `- ${f.description}: ${f.solution}`).join("\n")}\n` : ""}

Please provide:
1. **Root Cause**: The underlying cause of the fault
2. **Solution**: Step-by-step repair procedure
3. **Parts Required**: List of spare parts needed (if any)
4. **Repair Time**: Estimated time to complete repair
5. **Difficulty Level**: easy, medium, hard, or expert
6. **Safety Warnings**: Any hazards or precautions

Format your response as JSON with these exact keys:
{
  "rootCause": "...",
  "solution": "...",
  "partsRequired": ["part1", "part2"],
  "estimatedRepairTime": "X hours",
  "difficulty": "medium",
  "references": ["reference1", "reference2"]
}`;

    // Call LLM for analysis
    const response = await invokeLLM({
      messages: [
        { role: "system" as const, content: buildSystemPrompt() },
        { role: "user" as const, content: analysisPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fault_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              rootCause: { type: "string" },
              solution: { type: "string" },
              partsRequired: {
                type: "array",
                items: { type: "string" },
              },
              estimatedRepairTime: { type: "string" },
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard", "expert"],
              },
              references: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "rootCause",
              "solution",
              "partsRequired",
              "estimatedRepairTime",
              "difficulty",
              "references",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    // Parse the response
    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === "string" ? content : (typeof content === "object" && "text" in content ? (content as any).text : JSON.stringify(content));
    const analysisResult = JSON.parse(contentStr);

    // Find related faults based on the analysis
    const relatedFaults = similarFaults.map((fault) => ({
      id: fault.id,
      description: fault.description,
      similarity: 0.8, // Placeholder - could be enhanced with semantic similarity
    }));

    return {
      rootCause: analysisResult.rootCause,
      solution: analysisResult.solution,
      partsRequired: analysisResult.partsRequired,
      estimatedRepairTime: analysisResult.estimatedRepairTime,
      difficulty: analysisResult.difficulty,
      relatedFaults,
      references: analysisResult.references,
    };
  } catch (error) {
    console.error("Error analyzing fault:", error);
    throw new Error(
      `Fault analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Save analysis result to knowledge base
 */
export async function saveFaultAnalysis(
  request: FaultAnalysisRequest,
  analysis: FaultAnalysisResponse,
  userId: number | null = null
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    const result = await db
      .insert(faults)
      .values({
        userId,
        deviceType: request.deviceType,
        manufacturer: request.manufacturer,
        deviceModel: request.deviceModel,
        faultDescription: request.faultDescription,
        symptoms: request.symptoms,
        errorCodes: request.errorCodes,
        rootCause: analysis.rootCause,
        solution: analysis.solution,
        partsRequired: analysis.partsRequired.join(", "),
        estimatedRepairTime: analysis.estimatedRepairTime,
        difficulty: analysis.difficulty,
      });

    return result[0].insertId;
  } catch (error) {
    console.error("Error saving fault analysis:", error);
    throw new Error("Failed to save fault analysis");
  }
}

/**
 * Log query for analytics and learning
 */
export async function logQuery(
  userId: number,
  request: FaultAnalysisRequest,
  relatedFaultIds: number[],
  searchPerformed: boolean = false
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .insert(queryHistory)
      .values({
        userId,
        query: request.faultDescription,
        deviceType: request.deviceType,
        manufacturer: request.manufacturer,
        deviceModel: request.deviceModel,
        relatedFaultIds: relatedFaultIds.join(","),
        searchPerformed,
        queryCost: 1,
      });
  } catch (error) {
    console.error("Error logging query:", error);
  }
}

/**
 * Get analysis suggestions from similar faults
 */
export async function getSuggestedSolutions(
  deviceType: string,
  manufacturer: string
): Promise<Array<{ faultDescription: string; solution: string }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    const suggestions = await db
      .select()
      .from(faults)
      .where(eq(faults.deviceType, deviceType))
      .orderBy(desc(faults.views))
      .limit(10);

    return suggestions.map((f) => ({
      faultDescription: f.faultDescription,
      solution: f.solution || "",
    }));
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return [];
  }
}
