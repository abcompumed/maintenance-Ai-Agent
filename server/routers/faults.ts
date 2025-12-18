import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  analyzeFault,
  saveFaultAnalysis,
  logQuery,
  getSuggestedSolutions,
  FaultAnalysisRequest,
} from "../ai-agent";
import { getDb } from "../db";
import { faults, queryHistory } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const faultsRouter = router({
  /**
   * Analyze a fault and get AI-powered solution
   */
  analyze: protectedProcedure
    .input(
      z.object({
        deviceType: z.string().min(1),
        manufacturer: z.string().min(1),
        deviceModel: z.string().min(1),
        faultDescription: z.string().min(10),
        symptoms: z.string().optional(),
        errorCodes: z.string().optional(),
        uploadedDocumentIds: z.array(z.number()).optional(),
        saveToKnowledgeBase: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Check user's query quota
        const user = await db
          .select()
          .from((await import("../../drizzle/schema")).users)
          .where(
            eq((await import("../../drizzle/schema")).users.id, ctx.user.id)
          )
          .limit(1);

        if (!user.length || user[0].queriesRemaining <= 0) {
          throw new Error(
            "Query quota exceeded. Please upgrade your subscription."
          );
        }

        // Prepare analysis request
        const analysisRequest: FaultAnalysisRequest = {
          deviceType: input.deviceType,
          manufacturer: input.manufacturer,
          deviceModel: input.deviceModel,
          faultDescription: input.faultDescription,
          symptoms: input.symptoms,
          errorCodes: input.errorCodes,
          uploadedDocumentIds: input.uploadedDocumentIds,
        };

        // Analyze fault using AI agent
        const analysis = await analyzeFault(analysisRequest, ctx.user.id);

        // Save to knowledge base if requested
        let faultId: number | null = null;
        if (input.saveToKnowledgeBase) {
          faultId = await saveFaultAnalysis(
            analysisRequest,
            analysis,
            ctx.user.id
          );
        }

        // Log query for analytics
        await logQuery(
          ctx.user.id,
          analysisRequest,
          analysis.relatedFaults.map((f) => f.id),
          false
        );

        // Decrement query quota
        const usersTable = (await import("../../drizzle/schema")).users;
        await db
          .update(usersTable)
          .set({
            queriesRemaining: Math.max(0, user[0].queriesRemaining - 1),
            totalQueriesUsed: user[0].totalQueriesUsed + 1,
          })
          .where(eq(usersTable.id, ctx.user.id));

        return {
          success: true,
          faultId,
          analysis,
          queriesRemaining: Math.max(0, user[0].queriesRemaining - 1),
        };
      } catch (error) {
        console.error("Fault analysis error:", error);
        throw new Error(
          `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get fault details by ID
   */
  get: protectedProcedure
    .input(z.object({ faultId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const faultResult = await db
          .select()
          .from(faults)
          .where(eq(faults.id, input.faultId))
          .limit(1);

        if (!faultResult.length) {
          throw new Error("Fault not found");
        }

        const fault = faultResult[0];

        // Increment view count
        await db
          .update(faults)
          .set({ views: (fault.views || 0) + 1 })
          .where(eq(faults.id, input.faultId));

        return {
          id: fault.id,
          deviceType: fault.deviceType,
          manufacturer: fault.manufacturer,
          deviceModel: fault.deviceModel,
          faultDescription: fault.faultDescription,
          symptoms: fault.symptoms,
          errorCodes: fault.errorCodes,
          rootCause: fault.rootCause,
          solution: fault.solution,
          partsRequired: fault.partsRequired?.split(",") || [],
          estimatedRepairTime: fault.estimatedRepairTime,
          difficulty: fault.difficulty,
          views: (fault.views || 0) + 1,
          helpful: fault.helpful,
          notHelpful: fault.notHelpful,
          createdAt: fault.createdAt,
        };
      } catch (error) {
        console.error("Fault get error:", error);
        throw new Error("Failed to retrieve fault");
      }
    }),

  /**
   * Search faults by device type and manufacturer
   */
  search: protectedProcedure
    .input(
      z.object({
        deviceType: z.string().optional(),
        manufacturer: z.string().optional(),
        deviceModel: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const conditions = [];

        if (input.deviceType) {
          conditions.push(eq(faults.deviceType, input.deviceType));
        }
        if (input.manufacturer) {
          conditions.push(eq(faults.manufacturer, input.manufacturer));
        }
        if (input.deviceModel) {
          conditions.push(eq(faults.deviceModel, input.deviceModel));
        }

        let results;

        if (conditions.length > 0) {
          const { and } = await import("drizzle-orm");
          results = await db
            .select()
            .from(faults)
            .where(and(...conditions))
            .orderBy(desc(faults.views))
            .limit(input.limit)
            .offset(input.offset);
        } else {
          results = await db
            .select()
            .from(faults)
            .orderBy(desc(faults.views))
            .limit(input.limit)
            .offset(input.offset);
        }

        return {
          faults: results.map((f) => ({
            id: f.id,
            deviceType: f.deviceType,
            manufacturer: f.manufacturer,
            deviceModel: f.deviceModel,
            faultDescription: f.faultDescription,
            difficulty: f.difficulty,
            views: f.views,
            helpful: f.helpful,
            notHelpful: f.notHelpful,
          })),
        };
      } catch (error) {
        console.error("Fault search error:", error);
        throw new Error("Failed to search faults");
      }
    }),

  /**
   * Mark fault as helpful/not helpful
   */
  rateFault: protectedProcedure
    .input(
      z.object({
        faultId: z.number(),
        helpful: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const faultResult = await db
          .select()
          .from(faults)
          .where(eq(faults.id, input.faultId))
          .limit(1);

        if (!faultResult.length) {
          throw new Error("Fault not found");
        }

        const fault = faultResult[0];
        const updateData = input.helpful
          ? { helpful: (fault.helpful || 0) + 1 }
          : { notHelpful: (fault.notHelpful || 0) + 1 };

        await db
          .update(faults)
          .set(updateData)
          .where(eq(faults.id, input.faultId));

        return { success: true };
      } catch (error) {
        console.error("Fault rating error:", error);
        throw new Error("Failed to rate fault");
      }
    }),

  /**
   * Get suggested solutions for a device
   */
  getSuggestions: protectedProcedure
    .input(
      z.object({
        deviceType: z.string(),
        manufacturer: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const suggestions = await getSuggestedSolutions(
          input.deviceType,
          input.manufacturer
        );

        return {
          suggestions: suggestions.map((s) => ({
            faultDescription: s.faultDescription,
            solution: s.solution,
          })),
        };
      } catch (error) {
        console.error("Suggestions error:", error);
        throw new Error("Failed to get suggestions");
      }
    }),

  /**
   * Get user's query history
   */
  getQueryHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const history = await db
          .select()
          .from(queryHistory)
          .where(eq(queryHistory.userId, ctx.user.id))
          .orderBy(desc(queryHistory.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          queries: history.map((q) => ({
            id: q.id,
            query: q.query,
            deviceType: q.deviceType,
            manufacturer: q.manufacturer,
            deviceModel: q.deviceModel,
            searchPerformed: q.searchPerformed,
            createdAt: q.createdAt,
          })),
        };
      } catch (error) {
        console.error("Query history error:", error);
        throw new Error("Failed to retrieve query history");
      }
    }),
});
