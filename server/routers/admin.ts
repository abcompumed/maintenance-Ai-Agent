import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { searchSources } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Admin-only procedures for system management
 */
export const adminRouter = router({
  /**
   * Get all search sources (admin only)
   */
  getSources: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const sources = await db.select().from(searchSources);

        return {
          sources: sources.map((s) => ({
            id: s.id,
            name: s.name,
            url: s.url,
            sourceType: s.sourceType,
            isActive: s.isActive,
            lastScraped: s.lastScraped,
            createdAt: s.createdAt,
          })),
        };
    } catch (error) {
      console.error("Error getting sources:", error);
      throw new Error(
        `Failed to get sources: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),

  /**
   * Add a new search source (admin only)
   */
  addSource: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        sourceType: z.enum([
          "forum",
          "manual_repository",
          "vendor_site",
          "technical_blog",
          "other",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user?.role !== "admin") {
          throw new Error("Admin access required");
        }

        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const result = await db.insert(searchSources).values({
          name: input.name,
          url: input.url,
          sourceType: input.sourceType as any,
          isActive: true,
        });

        return {
          success: true,
          sourceId: result[0].insertId,
          message: `Source "${input.name}" added successfully`,
        };
      } catch (error) {
        console.error("Error adding source:", error);
        throw new Error(
          `Failed to add source: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Toggle source active status (admin only)
   */
  toggleSource: protectedProcedure
    .input(
      z.object({
        sourceId: z.number(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user?.role !== "admin") {
          throw new Error("Admin access required");
        }

        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db
          .update(searchSources)
          .set({ isActive: input.isActive })
          .where(eq(searchSources.id, input.sourceId));

        return {
          success: true,
          message: `Source ${input.isActive ? "enabled" : "disabled"} successfully`,
        };
      } catch (error) {
        console.error("Error toggling source:", error);
        throw new Error(
          `Failed to toggle source: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Delete a search source (admin only)
   */
  deleteSource: protectedProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user?.role !== "admin") {
          throw new Error("Admin access required");
        }

        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db
          .delete(searchSources)
          .where(eq(searchSources.id, input.sourceId));

        return {
          success: true,
          message: "Source deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting source:", error);
        throw new Error(
          `Failed to delete source: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get system statistics (admin only)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // This is a placeholder - in production, you'd calculate actual stats
      return {
        totalUsers: 0,
        totalQueries: 0,
        totalFaults: 0,
        totalDocuments: 0,
        activeSources: 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      throw new Error(
        `Failed to get statistics: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }),
});
